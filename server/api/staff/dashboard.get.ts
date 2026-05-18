import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const hotelId = user.role === 'ADMIN' ? undefined : user.hotelId

  if (user.role !== 'ADMIN' && !hotelId) {
    throw createError({ statusCode: 403, message: 'You are not assigned to a hotel' })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const roomFilter = hotelId ? { hotelId } : {}

  const [allRooms, todayArrivalsRaw, todayDeparturesRaw, recentActivity] = await Promise.all([
    prisma.room.findMany({ where: roomFilter, select: { id: true, status: true } }),
    prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        checkIn: { gte: today, lt: tomorrow },
        ...(hotelId && { bookingRooms: { some: { room: { hotelId } } } }),
      },
      include: {
        guest: { select: { id: true, name: true } },
        bookingRooms: { include: { room: { select: { roomNumber: true } } } },
      },
      orderBy: { id: 'asc' },
    }),
    prisma.booking.findMany({
      where: {
        status: 'CHECKED_IN',
        checkOut: { gte: today, lt: tomorrow },
        ...(hotelId && { bookingRooms: { some: { room: { hotelId } } } }),
      },
      include: {
        guest: { select: { id: true, name: true } },
        bookingRooms: { include: { room: { select: { roomNumber: true } } } },
      },
      orderBy: { id: 'asc' },
    }),
    prisma.auditLog.findMany({
      where: {
        action: { in: ['CHECK_IN', 'CHECK_OUT', 'ROOM_STATUS_CHANGE', 'BOOKING_CREATE', 'BOOKING_CANCEL'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { name: true } } },
    }),
  ])

  const totalRooms = allRooms.length
  const occupiedRooms = allRooms.filter((r) => r.status === 'OCCUPIED').length
  const availableRooms = allRooms.filter((r) => r.status === 'AVAILABLE').length
  const cleaningRooms = allRooms.filter((r) => r.status === 'CLEANING').length
  const outOfServiceRooms = allRooms.filter((r) => r.status === 'OUT_OF_SERVICE').length
  const occupancyRate = totalRooms === 0 ? 0 : Math.round((occupiedRooms / totalRooms) * 1000) / 10

  return {
    occupancy: {
      totalRooms,
      occupiedRooms,
      availableRooms,
      cleaningRooms,
      outOfServiceRooms,
      occupancyRate,
    },
    todayArrivals: todayArrivalsRaw.map((b) => ({
      bookingId: b.id,
      guestName: b.guest.name,
      roomNumbers: b.bookingRooms.map((br) => br.room.roomNumber),
    })),
    todayDepartures: todayDeparturesRaw.map((b) => ({
      bookingId: b.id,
      guestName: b.guest.name,
      roomNumbers: b.bookingRooms.map((br) => br.room.roomNumber),
    })),
    recentActivity: recentActivity.map((log) => ({
      id: log.id,
      action: log.action,
      details: log.details,
      timestamp: log.createdAt,
      userName: log.user?.name ?? 'System',
    })),
  }
})
