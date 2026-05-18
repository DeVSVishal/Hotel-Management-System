import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { checkIn, checkOut, hotelId, city, type, capacity, minPrice, maxPrice } = query

  if (!checkIn || !checkOut) {
    throw createError({ statusCode: 400, message: 'checkIn and checkOut are required' })
  }

  const checkInDate = new Date(String(checkIn))
  const checkOutDate = new Date(String(checkOut))

  if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
    throw createError({ statusCode: 400, message: 'Invalid date format' })
  }

  if (checkOutDate <= checkInDate) {
    throw createError({ statusCode: 400, message: 'checkOut must be after checkIn' })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (checkInDate < today) {
    throw createError({ statusCode: 400, message: 'checkIn cannot be in the past' })
  }

  const conflictingBookings = await prisma.bookingRoom.findMany({
    where: {
      booking: {
        status: { notIn: ['CANCELLED'] },
        AND: [
          { checkIn: { lt: checkOutDate } },
          { checkOut: { gt: checkInDate } },
        ],
      },
    },
    select: { roomId: true },
  })

  const bookedRoomIds = [...new Set(conflictingBookings.map((b) => b.roomId))]

  const rooms = await prisma.room.findMany({
    where: {
      status: { notIn: ['OUT_OF_SERVICE'] },
      ...(bookedRoomIds.length > 0 && { id: { notIn: bookedRoomIds } }),
      ...(hotelId && { hotelId: Number(hotelId) }),
      ...(type && { type: String(type) }),
      ...(capacity && { capacity: { gte: Number(capacity) } }),
      ...(city && { hotel: { city: { contains: String(city) } } }),
      ...((minPrice || maxPrice) && {
        priceOffPeak: {
          ...(minPrice && { gte: Number(minPrice) }),
          ...(maxPrice && { lte: Number(maxPrice) }),
        },
      }),
    },
    include: {
      hotel: { select: { id: true, name: true, city: true, country: true } },
    },
    orderBy: [{ priceOffPeak: 'asc' }],
  })

  return {
    checkIn: checkInDate.toISOString(),
    checkOut: checkOutDate.toISOString(),
    count: rooms.length,
    rooms,
  }
})
