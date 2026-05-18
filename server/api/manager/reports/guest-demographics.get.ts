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

  const bookings = await prisma.booking.findMany({
    where: {
      status: { notIn: ['CANCELLED'] },
      ...(hotelId && { bookingRooms: { some: { room: { hotelId } } } }),
    },
    include: {
      guest: { select: { id: true, name: true, email: true } },
      bookingRooms: { include: { room: { select: { hotelId: true } } } },
      services: true,
    },
  })

  type Stat = { guestId: number; name: string; email: string; spend: number; nights: number; count: number }
  const byGuest = new Map<number, Stat>()

  for (const b of bookings) {
    const nights = Math.ceil((b.checkOut.getTime() - b.checkIn.getTime()) / (1000 * 60 * 60 * 24))
    let bookingSpend = 0
    for (const br of b.bookingRooms) {
      if (hotelId && br.room.hotelId !== hotelId) continue
      bookingSpend += br.priceAtBooking * nights
    }
    for (const s of b.services) {
      bookingSpend += s.price * s.quantity
    }

    if (bookingSpend === 0) continue

    const existing = byGuest.get(b.guestId)
    if (existing) {
      existing.spend += bookingSpend
      existing.nights += nights
      existing.count++
    } else {
      byGuest.set(b.guestId, {
        guestId: b.guestId,
        name: b.guest.name,
        email: b.guest.email,
        spend: bookingSpend,
        nights,
        count: 1,
      })
    }
  }

  const round = (n: number) => Math.round(n * 100) / 100

  const topGuests = [...byGuest.values()]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10)
    .map((g) => ({
      guestId: g.guestId,
      name: g.name,
      email: g.email,
      totalSpend: round(g.spend),
      bookingCount: g.count,
    }))

  const totalBookings = bookings.length
  const totalNights = [...byGuest.values()].reduce((s, g) => s + g.nights, 0)
  const totalBookingCount = [...byGuest.values()].reduce((s, g) => s + g.count, 0)
  const averageStay = totalBookingCount === 0 ? 0 : round(totalNights / totalBookingCount)
  const uniqueGuests = byGuest.size
  const bookingFrequency = uniqueGuests === 0 ? 0 : round(totalBookingCount / uniqueGuests)

  return {
    topGuests,
    averageStay,
    bookingFrequency,
    uniqueGuests,
    totalBookings,
  }
})
