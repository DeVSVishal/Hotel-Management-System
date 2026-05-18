import prisma from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const priceOffPeak = body?.priceOffPeak !== undefined ? Number(body.priceOffPeak) : null
  const pricePeak = body?.pricePeak !== undefined ? Number(body.pricePeak) : null

  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid room id' })
  }
  if (priceOffPeak === null && pricePeak === null) {
    throw createError({ statusCode: 400, message: 'At least one of priceOffPeak or pricePeak required' })
  }
  if (priceOffPeak !== null && (Number.isNaN(priceOffPeak) || priceOffPeak < 0)) {
    throw createError({ statusCode: 400, message: 'Invalid priceOffPeak' })
  }
  if (pricePeak !== null && (Number.isNaN(pricePeak) || pricePeak < 0)) {
    throw createError({ statusCode: 400, message: 'Invalid pricePeak' })
  }

  const room = await prisma.room.findUnique({ where: { id } })
  if (!room) {
    throw createError({ statusCode: 404, message: 'Room not found' })
  }

  if (user.role === 'MANAGER') {
    if (!user.hotelId || room.hotelId !== user.hotelId) {
      throw createError({ statusCode: 403, message: 'Room does not belong to your hotel' })
    }
  }

  const update: any = {}
  if (priceOffPeak !== null) update.priceOffPeak = priceOffPeak
  if (pricePeak !== null) update.pricePeak = pricePeak

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.room.update({ where: { id }, data: update })

    const changes: string[] = []
    if (priceOffPeak !== null && priceOffPeak !== room.priceOffPeak) {
      changes.push(`off-peak £${room.priceOffPeak} → £${priceOffPeak}`)
    }
    if (pricePeak !== null && pricePeak !== room.pricePeak) {
      changes.push(`peak £${room.pricePeak} → £${pricePeak}`)
    }

    if (changes.length > 0) {
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'ROOM_RATE_CHANGE',
          details: `Room #${room.roomNumber}: ${changes.join(', ')}`,
        },
      })
    }

    return result
  })

  return { room: updated }
})
