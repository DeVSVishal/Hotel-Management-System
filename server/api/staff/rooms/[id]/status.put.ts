import prisma from '../../../../utils/prisma'

const VALID_TRANSITIONS: Record<string, string[]> = {
  AVAILABLE: ['CLEANING', 'OUT_OF_SERVICE'],
  CLEANING: ['AVAILABLE', 'OUT_OF_SERVICE'],
  OUT_OF_SERVICE: ['AVAILABLE'],
  OCCUPIED: ['CLEANING'],
}

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const newStatus = String(body?.status ?? '').toUpperCase()

  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid room id' })
  }

  if (!['AVAILABLE', 'OCCUPIED', 'CLEANING', 'OUT_OF_SERVICE'].includes(newStatus)) {
    throw createError({ statusCode: 400, message: 'Invalid status' })
  }

  const room = await prisma.room.findUnique({ where: { id } })
  if (!room) {
    throw createError({ statusCode: 404, message: 'Room not found' })
  }

  if (user.role === 'STAFF' || user.role === 'MANAGER') {
    if (!user.hotelId || room.hotelId !== user.hotelId) {
      throw createError({ statusCode: 403, message: 'Room does not belong to your hotel' })
    }
  }

  const oldStatus = room.status

  if (oldStatus === newStatus) {
    return { room }
  }

  const allowed = VALID_TRANSITIONS[oldStatus] ?? []
  if (!allowed.includes(newStatus)) {
    throw createError({
      statusCode: 400,
      message: `Cannot transition from ${oldStatus} to ${newStatus}`,
    })
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.room.update({
      where: { id },
      data: { status: newStatus as any },
    })

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'ROOM_STATUS_CHANGE',
        details: `Room #${room.roomNumber}: ${oldStatus} → ${newStatus}`,
      },
    })

    return result
  })

  return { room: updated }
})
