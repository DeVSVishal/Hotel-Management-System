import prisma from '../../../utils/prisma'

const ROOM_TYPES = ['STANDARD_DOUBLE', 'DELUXE_KING', 'FAMILY_SUITE', 'PENTHOUSE'] as const
const ROOM_STATUSES = ['AVAILABLE', 'OCCUPIED', 'CLEANING', 'OUT_OF_SERVICE'] as const

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 400, message: 'Invalid room id' })
  }

  const body = await readBody(event)
  const { roomNumber, type, capacity, priceOffPeak, pricePeak, status } = body ?? {}

  const room = await prisma.room.findUnique({ where: { id } })
  if (!room) {
    throw createError({ statusCode: 404, message: 'Room not found' })
  }

  if (type !== undefined && !ROOM_TYPES.includes(type)) {
    throw createError({ statusCode: 400, message: `Invalid room type. Allowed: ${ROOM_TYPES.join(', ')}` })
  }

  if (status !== undefined && !ROOM_STATUSES.includes(status)) {
    throw createError({ statusCode: 400, message: `Invalid status. Allowed: ${ROOM_STATUSES.join(', ')}` })
  }

  const updated = await prisma.room.update({
    where: { id },
    data: {
      ...(roomNumber !== undefined && { roomNumber: String(roomNumber) }),
      ...(type !== undefined && { type }),
      ...(capacity !== undefined && { capacity: Number(capacity) }),
      ...(priceOffPeak !== undefined && { priceOffPeak: Number(priceOffPeak) }),
      ...(pricePeak !== undefined && { pricePeak: Number(pricePeak) }),
      ...(status !== undefined && { status }),
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: event.context.user.id,
      action: 'ROOM_UPDATE',
      details: `Room #${updated.id}`,
    },
  })

  return { room: updated }
})
