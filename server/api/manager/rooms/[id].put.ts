import prisma from '../../../utils/prisma'

const ROOM_TYPES = ['STANDARD_DOUBLE', 'DELUXE_KING', 'FAMILY_SUITE', 'PENTHOUSE'] as const

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 400, message: 'Invalid room id' })
  }

  const body = await readBody(event)
  const { type, capacity, priceOffPeak, pricePeak } = body ?? {}

  const room = await prisma.room.findUnique({ where: { id } })
  if (!room) {
    throw createError({ statusCode: 404, message: 'Room not found' })
  }

  const user = event.context.user
  if (user.role === 'MANAGER' && user.hotelId && user.hotelId !== room.hotelId) {
    throw createError({ statusCode: 403, message: 'You can only manage rooms in your assigned hotel' })
  }

  if (type !== undefined && !ROOM_TYPES.includes(type)) {
    throw createError({ statusCode: 400, message: `Invalid room type. Allowed: ${ROOM_TYPES.join(', ')}` })
  }

  const updated = await prisma.room.update({
    where: { id },
    data: {
      ...(type !== undefined && { type }),
      ...(capacity !== undefined && { capacity: Number(capacity) }),
      ...(priceOffPeak !== undefined && { priceOffPeak: Number(priceOffPeak) }),
      ...(pricePeak !== undefined && { pricePeak: Number(pricePeak) }),
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'ROOM_UPDATE',
      details: `Room #${updated.id} (by manager)`,
    },
  })

  return { room: updated }
})
