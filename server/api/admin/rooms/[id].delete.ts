import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 400, message: 'Invalid room id' })
  }

  const room = await prisma.room.findUnique({ where: { id } })
  if (!room) {
    throw createError({ statusCode: 404, message: 'Room not found' })
  }

  /* =======================================================
        Block deletion while active bookings reference
        the room. Historical bookings (CHECKED_OUT,
        CANCELLED) are preserved via priceAtBooking
        snapshot, so they don't block the delete.
   ======================================================= */
  const activeBookings = await prisma.bookingRoom.count({
    where: {
      roomId: id,
      booking: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
    },
  })

  if (activeBookings > 0) {
    throw createError({
      statusCode: 409,
      message: `Cannot delete room — ${activeBookings} active booking(s) reference it`,
    })
  }

  await prisma.$transaction(async (tx) => {
    await tx.bookingRoom.deleteMany({ where: { roomId: id } })
    await tx.room.delete({ where: { id } })
    await tx.auditLog.create({
      data: {
        userId: event.context.user.id,
        action: 'ROOM_DELETE',
        details: `Room #${id} (${room.roomNumber}) at hotel #${room.hotelId}`,
      },
    })
  })

  return { success: true }
})
