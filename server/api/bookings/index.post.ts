import prisma from '../../utils/prisma'
import { getNightlyRate } from '../../utils/billing'

/* =======================================================
        Fixed service prices (per coursework spec)
   ======================================================= */
const SERVICE_TYPES = ['AIRPORT_TRANSFER', 'BREAKFAST', 'SPA_ACCESS', 'LATE_CHECKOUT'] as const
const SERVICE_PRICES: Record<(typeof SERVICE_TYPES)[number], number> = {
  AIRPORT_TRANSFER: 50,
  BREAKFAST: 20,
  SPA_ACCESS: 35,
  LATE_CHECKOUT: 40,
}

function averageNightlyRate(priceOffPeak: number, pricePeak: number, checkIn: Date, checkOut: Date): number {
  let total = 0
  let nights = 0
  const cursor = new Date(checkIn)
  while (cursor < checkOut) {
    total += getNightlyRate(priceOffPeak, pricePeak, cursor)
    nights++
    cursor.setDate(cursor.getDate() + 1)
  }
  return nights > 0 ? Math.round((total / nights) * 100) / 100 : priceOffPeak
}

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const body = await readBody(event)
  const { checkIn, checkOut, roomIds, services } = body ?? {}

  /* =======================================================
              Validation: dates, rooms, services
     ======================================================= */
  if (!checkIn || !checkOut || !Array.isArray(roomIds) || roomIds.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'checkIn, checkOut, and at least one roomId are required',
    })
  }

  const checkInDate = new Date(checkIn)
  const checkOutDate = new Date(checkOut)

  if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
    throw createError({ statusCode: 400, message: 'Invalid date format' })
  }

  if (checkOutDate <= checkInDate) {
    throw createError({ statusCode: 400, message: 'checkOut must be after checkIn' })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (checkInDate < today) {
    throw createError({ statusCode: 400, message: 'checkIn cannot be in the past' })
  }

  const requestedIds = roomIds.map((r: unknown) => Number(r))
  const rooms = await prisma.room.findMany({ where: { id: { in: requestedIds } } })

  if (rooms.length !== requestedIds.length) {
    throw createError({ statusCode: 404, message: 'One or more rooms not found' })
  }

  const blocked = rooms.find((r) => r.status === 'OUT_OF_SERVICE')
  if (blocked) {
    throw createError({ statusCode: 409, message: `Room ${blocked.roomNumber} is out of service` })
  }

  /* =======================================================
        Date overlap guard (race-condition protection)
   ======================================================= */
  const conflicts = await prisma.bookingRoom.findMany({
    where: {
      roomId: { in: requestedIds },
      booking: {
        status: { notIn: ['CANCELLED'] },
        AND: [
          { checkIn: { lt: checkOutDate } },
          { checkOut: { gt: checkInDate } },
        ],
      },
    },
    select: { roomId: true },
  })

  if (conflicts.length > 0) {
    const conflictIds = [...new Set(conflicts.map((c) => c.roomId))]
    throw createError({
      statusCode: 409,
      message: `Room(s) unavailable for the requested dates: ${conflictIds.join(', ')}`,
    })
  }

  const validServices: { service: (typeof SERVICE_TYPES)[number]; quantity: number; price: number }[] = []
  if (Array.isArray(services)) {
    for (const s of services) {
      if (!s?.service || !SERVICE_TYPES.includes(s.service)) {
        throw createError({ statusCode: 400, message: `Invalid service type: ${s?.service}` })
      }
      const quantity = Math.max(1, Number(s.quantity ?? 1))
      validServices.push({ service: s.service, quantity, price: SERVICE_PRICES[s.service as keyof typeof SERVICE_PRICES] })
    }
  }

  /* =======================================================
        Persist booking, rooms, services, audit log.
        Room.status stays AVAILABLE until check-in;
        availability is enforced by overlapping dates above.
     ======================================================= */
  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        guestId: user.id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        status: 'CONFIRMED',
        bookingRooms: {
          create: rooms.map((r) => ({
            roomId: r.id,
            priceAtBooking: averageNightlyRate(r.priceOffPeak, r.pricePeak, checkInDate, checkOutDate),
          })),
        },
        services: {
          create: validServices,
        },
      },
      include: {
        bookingRooms: { include: { room: { include: { hotel: true } } } },
        services: true,
      },
    })

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'BOOKING_CREATE',
        details: `Booking #${created.id} (${requestedIds.length} room(s), ${checkInDate.toISOString().slice(0, 10)} → ${checkOutDate.toISOString().slice(0, 10)})`,
      },
    })

    return created
  })

  return { booking }
})
