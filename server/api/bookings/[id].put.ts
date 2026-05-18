import prisma from '../../utils/prisma'
import { getNightlyRate } from '../../utils/billing'

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
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 400, message: 'Invalid booking id' })
  }

  const user = event.context.user
  const body = await readBody(event)
  const { checkIn, checkOut } = body ?? {}

  if (!checkIn || !checkOut) {
    throw createError({ statusCode: 400, message: 'checkIn and checkOut are required' })
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { bookingRooms: { include: { room: true } } },
  })

  if (!booking) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  const isOwner = booking.guestId === user.id
  const isStaffOrAbove = ['STAFF', 'MANAGER', 'ADMIN'].includes(user.role)
  if (!isOwner && !isStaffOrAbove) {
    throw createError({ statusCode: 403, message: 'You cannot modify this booking' })
  }

  if (booking.status !== 'CONFIRMED') {
    throw createError({
      statusCode: 409,
      message: `Cannot modify a booking in status ${booking.status}`,
    })
  }

  const hoursUntilCheckIn = (booking.checkIn.getTime() - Date.now()) / (1000 * 60 * 60)
  if (isOwner && !isStaffOrAbove && hoursUntilCheckIn < 48) {
    throw createError({
      statusCode: 409,
      message: 'Bookings can only be modified more than 48 hours before check-in',
    })
  }

  const newCheckIn = new Date(checkIn)
  const newCheckOut = new Date(checkOut)

  if (Number.isNaN(newCheckIn.getTime()) || Number.isNaN(newCheckOut.getTime())) {
    throw createError({ statusCode: 400, message: 'Invalid date format' })
  }

  if (newCheckOut <= newCheckIn) {
    throw createError({ statusCode: 400, message: 'checkOut must be after checkIn' })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (newCheckIn < today) {
    throw createError({ statusCode: 400, message: 'checkIn cannot be in the past' })
  }

  const roomIds = booking.bookingRooms.map((br) => br.roomId)
  const conflicts = await prisma.bookingRoom.findMany({
    where: {
      roomId: { in: roomIds },
      bookingId: { not: booking.id },
      booking: {
        status: { notIn: ['CANCELLED'] },
        AND: [
          { checkIn: { lt: newCheckOut } },
          { checkOut: { gt: newCheckIn } },
        ],
      },
    },
    select: { roomId: true },
  })

  if (conflicts.length > 0) {
    throw createError({
      statusCode: 409,
      message: 'One or more rooms are unavailable for the new dates',
    })
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id },
      data: { checkIn: newCheckIn, checkOut: newCheckOut },
    })

    for (const br of booking.bookingRooms) {
      await tx.bookingRoom.update({
        where: { bookingId_roomId: { bookingId: id, roomId: br.roomId } },
        data: {
          priceAtBooking: averageNightlyRate(
            br.room.priceOffPeak,
            br.room.pricePeak,
            newCheckIn,
            newCheckOut,
          ),
        },
      })
    }

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'BOOKING_UPDATE',
        details: `Booking #${id} dates → ${newCheckIn.toISOString().slice(0, 10)} → ${newCheckOut.toISOString().slice(0, 10)}`,
      },
    })

    return tx.booking.findUnique({
      where: { id },
      include: {
        bookingRooms: { include: { room: { include: { hotel: true } } } },
        services: true,
      },
    })
  })

  return { booking: updated }
})
