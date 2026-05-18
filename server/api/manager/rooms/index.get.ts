import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const query = getQuery(event)
  const hotelIdParam = query.hotelId ? Number(query.hotelId) : null

  let hotelId: number | null = hotelIdParam
  if (user.role === 'MANAGER') {
    hotelId = user.hotelId ?? null
    if (!hotelId) {
      throw createError({ statusCode: 403, message: 'You are not assigned to a hotel' })
    }
  }

  const rooms = await prisma.room.findMany({
    where: hotelId ? { hotelId } : {},
    include: { hotel: { select: { id: true, name: true } } },
    orderBy: [{ hotelId: 'asc' }, { roomNumber: 'asc' }],
  })

  return { rooms }
})
