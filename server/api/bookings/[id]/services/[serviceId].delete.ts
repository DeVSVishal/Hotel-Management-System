import prisma from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const id = Number(getRouterParam(event, 'id'))
  const serviceId = Number(getRouterParam(event, 'serviceId'))

  if (!id || Number.isNaN(id) || !serviceId || Number.isNaN(serviceId)) {
    throw createError({ statusCode: 400, message: 'Invalid id' })
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      bookingRooms: { include: { room: true } },
      services: { where: { id: serviceId } },
    },
  })

  if (!booking) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }
  if (booking.services.length === 0) {
    throw createError({ statusCode: 404, message: 'Service not found on this booking' })
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
    throw createError({ statusCode: 400, message: `Cannot remove services from a ${booking.status} booking` })
  }

  await prisma.$transaction(async (tx) => {
    await tx.bookingService.delete({ where: { id: serviceId } })
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'SERVICE_REMOVE',
        details: `Booking #${id}: removed service #${serviceId}`,
      },
    })
  })

  return { ok: true }
})
