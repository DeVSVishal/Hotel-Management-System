import prisma from '../../../utils/prisma'

const SERVICE_TYPES = ['AIRPORT_TRANSFER', 'BREAKFAST', 'SPA_ACCESS', 'LATE_CHECKOUT'] as const
const SERVICE_PRICES: Record<(typeof SERVICE_TYPES)[number], number> = {
  AIRPORT_TRANSFER: 50,
  BREAKFAST: 20,
  SPA_ACCESS: 35,
  LATE_CHECKOUT: 40,
}

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const service = String(body?.service ?? '').toUpperCase()
  const quantity = Math.max(1, Number(body?.quantity ?? 1))

  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid booking id' })
  }

  if (!SERVICE_TYPES.includes(service as any)) {
    throw createError({ statusCode: 400, message: 'Invalid service type' })
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { bookingRooms: { include: { room: true } } },
  })

  if (!booking) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  const isOwner = booking.guestId === user.id
  const isStaff = ['STAFF', 'MANAGER', 'ADMIN'].includes(user.role)
  if (!isOwner && !isStaff) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  if (isStaff && !isOwner && user.role !== 'ADMIN' && user.hotelId) {
    const sameHotel = booking.bookingRooms.every((br) => br.room.hotelId === user.hotelId)
    if (!sameHotel) {
      throw createError({ statusCode: 403, message: 'Booking does not belong to your hotel' })
    }
  }

  if (!['CONFIRMED', 'CHECKED_IN'].includes(booking.status)) {
    throw createError({ statusCode: 400, message: `Cannot add services to a ${booking.status} booking` })
  }

  const created = await prisma.$transaction(async (tx) => {
    const newService = await tx.bookingService.create({
      data: {
        bookingId: id,
        service: service as any,
        quantity,
        price: SERVICE_PRICES[service as keyof typeof SERVICE_PRICES],
      },
    })

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'SERVICE_ADD',
        details: `Booking #${id}: +${quantity}× ${service}`,
      },
    })

    return newService
  })

  return { service: created }
})
