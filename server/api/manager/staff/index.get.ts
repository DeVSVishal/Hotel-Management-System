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

  const staff = await prisma.user.findMany({
    where: {
      role: { in: ['STAFF', 'MANAGER'] },
      ...(hotelId && { hotelId }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      hotelId: true,
      createdAt: true,
      hotel: { select: { name: true } },
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })

  return { staff }
})
