import prisma from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const id = Number(getRouterParam(event, 'id'))

  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid booking id' })
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      bookingRooms: { include: { room: true } },
      guest: { select: { id: true, name: true } },
    },
  })

  if (!booking) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  if (booking.status !== 'CONFIRMED') {
    throw createError({ statusCode: 400, message: `Cannot check in a booking with status ${booking.status}` })
  }

  if (user.role === 'STAFF' || user.role === 'MANAGER') {
    if (!user.hotelId) {
      throw createError({ statusCode: 403, message: 'You are not assigned to a hotel' })
    }
    const sameHotel = booking.bookingRooms.every((br) => br.room.hotelId === user.hotelId)
    if (!sameHotel) {
      throw createError({ statusCode: 403, message: 'Booking does not belong to your hotel' })
    }
  }

  const roomIds = booking.bookingRooms.map((br) => br.roomId)

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.booking.update({
      where: { id },
      data: { status: 'CHECKED_IN' },
      include: {
        bookingRooms: { include: { room: true } },
        guest: { select: { id: true, name: true, email: true } },
        services: true,
      },
    })

    await tx.room.updateMany({
      where: { id: { in: roomIds } },
      data: { status: 'OCCUPIED' },
    })

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'CHECK_IN',
        details: `Booking #${id}`,
      },
    })

    return result
  })

  return { booking: updated }
})
