import prisma from '../../../utils/prisma'
import { calculateCancellationFee, calculateInvoiceTotal } from '../../../utils/billing'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 400, message: 'Invalid booking id' })
  }

  const user = event.context.user

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      bookingRooms: { include: { room: true } },
      services: true,
      invoice: true,
    },
  })

  if (!booking) {
    throw createError({ statusCode: 404, message: 'Booking not found' })
  }

  const isOwner = booking.guestId === user.id
  const isStaffOrAbove = ['STAFF', 'MANAGER', 'ADMIN'].includes(user.role)
  if (!isOwner && !isStaffOrAbove) {
    throw createError({ statusCode: 403, message: 'You cannot cancel this booking' })
  }

  if (booking.status === 'CANCELLED') {
    throw createError({ statusCode: 409, message: 'Booking is already cancelled' })
  }

  if (booking.status === 'CHECKED_OUT') {
    throw createError({ statusCode: 409, message: 'Cannot cancel a completed booking' })
  }

  const cancelledAt = new Date()
  const firstNightPrice = booking.bookingRooms[0]?.priceAtBooking ?? 0
  const totalBookingValue = calculateInvoiceTotal({
    bookingRooms: booking.bookingRooms,
    services: booking.services,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
  })

  const fee = calculateCancellationFee(booking.checkIn, cancelledAt, firstNightPrice, totalBookingValue)

  const result = await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt },
    })

    const roomIds = booking.bookingRooms.map((br) => br.roomId)
    await tx.room.updateMany({
      where: { id: { in: roomIds }, status: 'OCCUPIED' },
      data: { status: 'AVAILABLE' },
    })

    let invoice = null
    if (fee > 0 && !booking.invoice) {
      invoice = await tx.invoice.create({
        data: {
          bookingId: id,
          totalAmount: fee,
          paid: false,
        },
      })
    }

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'BOOKING_CANCEL',
        details: `Booking #${id} cancelled, fee: £${fee.toFixed(2)}`,
      },
    })

    return { invoice }
  })

  return {
    success: true,
    cancellationFee: fee,
    invoice: result.invoice,
  }
})
