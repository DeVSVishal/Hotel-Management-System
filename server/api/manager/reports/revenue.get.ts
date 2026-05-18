import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const query = getQuery(event)
  const startDate = query.startDate ? new Date(String(query.startDate)) : null
  const endDate = query.endDate ? new Date(String(query.endDate)) : null
  const hotelIdParam = query.hotelId ? Number(query.hotelId) : null

  if (!startDate || !endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw createError({ statusCode: 400, message: 'startDate and endDate are required' })
  }
  if (endDate <= startDate) {
    throw createError({ statusCode: 400, message: 'endDate must be after startDate' })
  }

  let hotelId: number | null = hotelIdParam
  if (user.role === 'MANAGER') {
    hotelId = user.hotelId ?? null
    if (!hotelId) {
      throw createError({ statusCode: 403, message: 'You are not assigned to a hotel' })
    }
  }

  const bookings = await prisma.booking.findMany({
    where: {
      status: { notIn: ['CANCELLED'] },
      AND: [
        { checkIn: { lt: endDate } },
        { checkOut: { gte: startDate } },
      ],
      ...(hotelId && { bookingRooms: { some: { room: { hotelId } } } }),
    },
    include: {
      bookingRooms: { include: { room: { select: { type: true, hotelId: true } } } },
      services: true,
    },
  })

  let roomRevenue = 0
  let serviceRevenue = 0
  const byRoomType: Record<string, number> = {}
  const byService: Record<string, number> = {}

  for (const b of bookings) {
    const nights = Math.ceil((b.checkOut.getTime() - b.checkIn.getTime()) / (1000 * 60 * 60 * 24))
    for (const br of b.bookingRooms) {
      if (hotelId && br.room.hotelId !== hotelId) continue
      const sub = br.priceAtBooking * nights
      roomRevenue += sub
      byRoomType[br.room.type] = (byRoomType[br.room.type] ?? 0) + sub
    }
    for (const s of b.services) {
      const sub = s.price * s.quantity
      serviceRevenue += sub
      byService[s.service] = (byService[s.service] ?? 0) + sub
    }
  }

  const round = (n: number) => Math.round(n * 100) / 100

  return {
    totalRevenue: round(roomRevenue + serviceRevenue),
    roomRevenue: round(roomRevenue),
    serviceRevenue: round(serviceRevenue),
    byRoomType: Object.entries(byRoomType)
      .map(([type, revenue]) => ({ type, revenue: round(revenue) }))
      .sort((a, b) => b.revenue - a.revenue),
    byService: Object.entries(byService)
      .map(([service, revenue]) => ({ service, revenue: round(revenue) }))
      .sort((a, b) => b.revenue - a.revenue),
  }
})
