import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 400, message: 'Invalid hotel id' })
  }

  const body = await readBody(event)
  const { name, city, country } = body ?? {}

  const existing = await prisma.hotel.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Hotel not found' })
  }

  const hotel = await prisma.hotel.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(city !== undefined && { city: String(city).trim() }),
      ...(country !== undefined && { country: String(country).trim() }),
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: event.context.user.id,
      action: 'HOTEL_UPDATE',
      details: `Hotel #${hotel.id}`,
    },
  })

  return { hotel }
})
