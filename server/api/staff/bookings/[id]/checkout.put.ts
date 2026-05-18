import prisma from '../../../../utils/prisma'
import { calculateInvoiceTotal } from '../../../../utils/billing'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const id = Number(getRouterParam(event, 'id'))

  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid booking id' })
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      bookingRooms: { include: { room: true } },
      services: true,
      guest: { select: { id: true, name: true } },
      invoice: true,
    },
  })

  if (!booking) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  if (booking.status !== 'CHECKED_IN') {
    throw createError({ statusCode: 400, message: `Cannot check out a booking with status ${booking.status}` })
  }

  if (user.role === 'STAFF' || user.role === 'MANAGER') {
    if (!user.hotelId) {
      throw createError({ statusCode: 403, message: 'You are not assigned to a hotel' })
    }
    const sameHotel = booking.bookingRooms.every((br) => br.room.hotelId === user.hotelId)
    if (!sameHotel) {
      throw createError({ statusCode: 403, message: 'Booking does not belong to your hotel' })
    }
  }

  const totalAmount = calculateInvoiceTotal({
    bookingRooms: booking.bookingRooms.map((br) => ({ priceAtBooking: br.priceAtBooking })),
    services: booking.services.map((s) => ({ price: s.price, quantity: s.quantity })),
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
  })

  const roomIds = booking.bookingRooms.map((br) => br.roomId)

  const result = await prisma.$transaction(async (tx) => {
    const updatedBooking = await tx.booking.update({
      where: { id },
      data: { status: 'CHECKED_OUT' },
    })

    await tx.room.updateMany({
      where: { id: { in: roomIds } },
      data: { status: 'CLEANING' },
    })

    let invoice
    if (booking.invoice) {
      invoice = await tx.invoice.update({
        where: { bookingId: id },
        data: { totalAmount },
      })
    } else {
      invoice = await tx.invoice.create({
        data: {
          bookingId: id,
          totalAmount,
          paid: false,
        },
      })
    }

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'CHECK_OUT',
        details: `Booking #${id} (£${totalAmount})`,
      },
    })

    return { booking: updatedBooking, invoice }
  })

  return result
})
