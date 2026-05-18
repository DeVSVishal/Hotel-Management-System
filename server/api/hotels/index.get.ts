import prisma from '../../utils/prisma'

export default defineEventHandler(async () => {
  const hotels = await prisma.hotel.findMany({
    include: {
      _count: { select: { rooms: true } },
    },
    orderBy: { name: 'asc' },
  })

  return {
    hotels: hotels.map((h) => ({
      id: h.id,
      name: h.name,
      city: h.city,
      country: h.country,
      roomCount: h._count.rooms,
    })),
  }
})
