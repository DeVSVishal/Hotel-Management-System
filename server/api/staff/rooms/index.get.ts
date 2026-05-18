import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const query = getQuery(event)

  const hotelId = user.role === 'ADMIN' ? undefined : user.hotelId
  if (user.role !== 'ADMIN' && !hotelId) {
    throw createError({ statusCode: 403, message: 'You are not assigned to a hotel' })
  }

  const where: any = {}
  if (hotelId) where.hotelId = hotelId
  if (query.status) where.status = String(query.status)
  if (query.type) where.type = String(query.type)

  const rooms = await prisma.room.findMany({
    where,
    include: { hotel: { select: { id: true, name: true } } },
    orderBy: [{ hotelId: 'asc' }, { roomNumber: 'asc' }],
  })

  return { rooms }
})
