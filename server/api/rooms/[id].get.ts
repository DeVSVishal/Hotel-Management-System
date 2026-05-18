import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 400, message: 'Invalid room id' })
  }

  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      hotel: { select: { id: true, name: true, city: true, country: true } },
    },
  })

  if (!room) {
    throw createError({ statusCode: 404, message: 'Room not found' })
  }

  return { room }
})
