import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 400, message: 'Invalid hotel id' })
  }

  const hotel = await prisma.hotel.findUnique({
    where: { id },
    include: {
      rooms: {
        orderBy: [{ type: 'asc' }, { roomNumber: 'asc' }],
      },
    },
  })

  if (!hotel) {
    throw createError({ statusCode: 404, message: 'Hotel not found' })
  }

  return { hotel }
})
