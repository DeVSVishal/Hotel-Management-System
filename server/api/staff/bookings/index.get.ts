import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const query = getQuery(event)
  const statusFilter = query.status ? String(query.status) : undefined

  const hotelId = user.role === 'ADMIN' ? undefined : user.hotelId
  if (user.role !== 'ADMIN' && !hotelId) {
    throw createError({ statusCode: 403, message: 'You are not assigned to a hotel' })
  }

  const validStatuses = ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']
  const where: any = {}
  if (statusFilter && validStatuses.includes(statusFilter)) {
    where.status = statusFilter
  }
  if (hotelId) {
    where.bookingRooms = { some: { room: { hotelId } } }
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      guest: { select: { id: true, name: true, email: true } },
      bookingRooms: { include: { room: { select: { id: true, roomNumber: true, type: true } } } },
      services: true,
      invoice: { select: { id: true, totalAmount: true, paid: true } },
    },
    orderBy: { checkIn: 'desc' },
    take: 100,
  })

  return { bookings }
})
