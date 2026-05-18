import prisma from '../../../utils/prisma'
import { calculateInvoiceTotal } from '../../../utils/billing'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const id = Number(getRouterParam(event, 'id'))

  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid booking id' })
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      guest: { select: { id: true, name: true, email: true } },
      bookingRooms: {
        include: { room: { include: { hotel: { select: { name: true, city: true, country: true } } } } },
      },
      services: true,
      invoice: true,
    },
  })

  if (!booking) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  const isOwner = booking.guestId === user.id
  const isStaff = ['STAFF', 'MANAGER', 'ADMIN'].includes(user.role)
  if (!isOwner && !isStaff) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const nights = Math.ceil((booking.checkOut.getTime() - booking.checkIn.getTime()) / (1000 * 60 * 60 * 24))

  const roomLines = booking.bookingRooms.map((br) => ({
    roomId: br.roomId,
    roomNumber: br.room.roomNumber,
    type: br.room.type,
    nightlyRate: br.priceAtBooking,
    nights,
    subtotal: Math.round(br.priceAtBooking * nights * 100) / 100,
  }))

  const serviceLines = booking.services.map((s) => ({
    id: s.id,
    service: s.service,
    quantity: s.quantity,
    price: s.price,
    subtotal: Math.round(s.price * s.quantity * 100) / 100,
  }))

  const total = calculateInvoiceTotal({
    bookingRooms: booking.bookingRooms.map((br) => ({ priceAtBooking: br.priceAtBooking })),
    services: booking.services.map((s) => ({ price: s.price, quantity: s.quantity })),
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
  })

  return {
    invoice: {
      id: booking.invoice?.id ?? null,
      bookingId: booking.id,
      hotel: booking.bookingRooms[0]?.room.hotel ?? null,
      guest: booking.guest,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      nights,
      status: booking.status,
      roomLines,
      serviceLines,
      roomsTotal: Math.round(roomLines.reduce((s, r) => s + r.subtotal, 0) * 100) / 100,
      servicesTotal: Math.round(serviceLines.reduce((s, r) => s + r.subtotal, 0) * 100) / 100,
      total,
      paid: booking.invoice?.paid ?? false,
      issuedAt: booking.invoice?.issuedAt ?? null,
      paidAt: booking.invoice?.paidAt ?? null,
    },
  }
})
