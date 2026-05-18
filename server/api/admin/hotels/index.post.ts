import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, city, country } = body ?? {}

  if (!name || !city || !country) {
    throw createError({ statusCode: 400, message: 'name, city, and country are required' })
  }

  const hotel = await prisma.hotel.create({
    data: {
      name: String(name).trim(),
      city: String(city).trim(),
      country: String(country).trim(),
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: event.context.user.id,
      action: 'HOTEL_CREATE',
      details: `Hotel #${hotel.id} (${hotel.name})`,
    },
  })

  return { hotel }
})
