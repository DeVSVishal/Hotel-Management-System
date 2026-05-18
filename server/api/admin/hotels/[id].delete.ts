import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 400, message: 'Invalid hotel id' })
  }

  const hotel = await prisma.hotel.findUnique({ where: { id } })
  if (!hotel) {
    throw createError({ statusCode: 404, message: 'Hotel not found' })
  }

  const activeBookings = await prisma.booking.count({
    where: {
      status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      bookingRooms: { some: { room: { hotelId: id } } },
    },
  })

  if (activeBookings > 0) {
    throw createError({
      statusCode: 409,
      message: `Cannot delete hotel — ${activeBookings} active booking(s) reference its rooms`,
    })
  }

  await prisma.room.deleteMany({ where: { hotelId: id } })
  await prisma.hotel.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      userId: event.context.user.id,
      action: 'HOTEL_DELETE',
      details: `Hotel #${id} (${hotel.name})`,
    },
  })

  return { success: true }
})
