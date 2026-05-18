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

  const roomFilter = hotelId ? { hotelId } : {}
  const totalRooms = await prisma.room.count({ where: roomFilter })

  const bookingRooms = await prisma.bookingRoom.findMany({
    where: {
      booking: {
        status: { notIn: ['CANCELLED'] },
        AND: [
          { checkIn: { lt: endDate } },
          { checkOut: { gt: startDate } },
        ],
      },
      ...(hotelId && { room: { hotelId } }),
    },
    include: {
      booking: { select: { checkIn: true, checkOut: true } },
    },
  })

  const days: { date: string; totalRooms: number; bookedRooms: number; rate: number }[] = []
  const cursor = new Date(startDate)
  cursor.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  while (cursor < end) {
    const dayStart = new Date(cursor)
    const dayEnd = new Date(cursor)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const bookedRoomIds = new Set<number>()
    for (const br of bookingRooms) {
      if (br.booking.checkIn < dayEnd && br.booking.checkOut > dayStart) {
        bookedRoomIds.add(br.roomId)
      }
    }
    const bookedRooms = bookedRoomIds.size
    const rate = totalRooms === 0 ? 0 : Math.round((bookedRooms / totalRooms) * 1000) / 10
    days.push({
      date: cursor.toISOString().slice(0, 10),
      totalRooms,
      bookedRooms,
      rate,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return { days }
})
