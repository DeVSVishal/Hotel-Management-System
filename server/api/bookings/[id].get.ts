import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 400, message: 'Invalid booking id' })
  }

  const user = event.context.user

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      guest: { select: { id: true, name: true, email: true, phone: true } },
      bookingRooms: { include: { room: { include: { hotel: true } } } },
      services: true,
      invoice: true,
    },
  })

  if (!booking) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  const isOwner = booking.guestId === user.id
  const isStaffOrAbove = ['STAFF', 'MANAGER', 'ADMIN'].includes(user.role)

  if (!isOwner && !isStaffOrAbove) {
    throw createError({ statusCode: 403, message: 'You do not have access to this booking' })
  }

  return { booking }
})
