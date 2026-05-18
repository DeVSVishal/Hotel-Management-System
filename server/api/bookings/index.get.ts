import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user

  const bookings = await prisma.booking.findMany({
    where: { guestId: user.id },
    include: {
      bookingRooms: { include: { room: { include: { hotel: true } } } },
      services: true,
      invoice: true,
    },
    orderBy: { checkIn: 'desc' },
  })

  return { bookings }
})
