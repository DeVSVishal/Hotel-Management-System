import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const id = Number(getRouterParam(event, 'id'))

  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid invoice id' })
  }

  if (!['STAFF', 'MANAGER', 'ADMIN'].includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Staff access required' })
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { booking: { include: { bookingRooms: { include: { room: true } } } } },
  })

  if (!invoice) {
    throw createError({ statusCode: 404, message: 'Invoice not found' })
  }

  if (invoice.paid) {
    throw createError({ statusCode: 400, message: 'Invoice already paid' })
  }

  if (user.role === 'STAFF' || user.role === 'MANAGER') {
    if (!user.hotelId) {
      throw createError({ statusCode: 403, message: 'You are not assigned to a hotel' })
    }
    const sameHotel = invoice.booking.bookingRooms.every((br) => br.room.hotelId === user.hotelId)
    if (!sameHotel) {
      throw createError({ statusCode: 403, message: 'Invoice does not belong to your hotel' })
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.invoice.update({
      where: { id },
      data: { paid: true, paidAt: new Date() },
    })
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'INVOICE_PAID',
        details: `Invoice #${id} (booking #${invoice.bookingId}, £${invoice.totalAmount})`,
      },
    })
    return result
  })

  return { invoice: updated }
})
