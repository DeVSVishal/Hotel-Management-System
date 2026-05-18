import prisma from '../../../utils/prisma'

const ROOM_TYPES = ['STANDARD_DOUBLE', 'DELUXE_KING', 'FAMILY_SUITE', 'PENTHOUSE'] as const

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { roomNumber, type, capacity, priceOffPeak, pricePeak, hotelId } = body ?? {}

  if (!roomNumber || !type || !capacity || priceOffPeak == null || pricePeak == null || !hotelId) {
    throw createError({
      statusCode: 400,
      message: 'roomNumber, type, capacity, priceOffPeak, pricePeak, and hotelId are required',
    })
  }

  if (!ROOM_TYPES.includes(type)) {
    throw createError({ statusCode: 400, message: `Invalid room type. Allowed: ${ROOM_TYPES.join(', ')}` })
  }

  const hotel = await prisma.hotel.findUnique({ where: { id: Number(hotelId) } })
  if (!hotel) {
    throw createError({ statusCode: 404, message: 'Hotel not found' })
  }

  const duplicate = await prisma.room.findFirst({
    where: { hotelId: Number(hotelId), roomNumber: String(roomNumber) },
  })
  if (duplicate) {
    throw createError({ statusCode: 409, message: 'Room number already exists for this hotel' })
  }

  const room = await prisma.room.create({
    data: {
      roomNumber: String(roomNumber),
      type,
      capacity: Number(capacity),
      priceOffPeak: Number(priceOffPeak),
      pricePeak: Number(pricePeak),
      hotelId: Number(hotelId),
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: event.context.user.id,
      action: 'ROOM_CREATE',
      details: `Room #${room.id} (${room.roomNumber}) at hotel #${room.hotelId}`,
    },
  })

  return { room }
})
