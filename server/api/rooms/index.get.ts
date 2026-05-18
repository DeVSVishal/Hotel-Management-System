import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const { hotelId, type, status } = getQuery(event)

  const rooms = await prisma.room.findMany({
    where: {
      ...(hotelId && { hotelId: Number(hotelId) }),
      ...(type && { type: type as string }),
      ...(status && { status: status as string }),
    },
    include: {
      hotel: { select: { id: true, name: true, city: true, country: true } },
    },
    orderBy: [{ hotelId: 'asc' }, { roomNumber: 'asc' }],
  })

  return { rooms }
})
