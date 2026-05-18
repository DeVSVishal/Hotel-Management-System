import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const body = await readBody(event)
  const { email, password, name } = body ?? {}
  const role = String(body?.role ?? 'STAFF').toUpperCase()
  const hotelIdParam = body?.hotelId ? Number(body.hotelId) : null

  if (!email || !password || !name) {
    throw createError({ statusCode: 400, message: 'email, password, name required' })
  }

  if (!['STAFF', 'MANAGER'].includes(role)) {
    throw createError({ statusCode: 400, message: 'Role must be STAFF or MANAGER' })
  }

  if (user.role === 'MANAGER' && role === 'MANAGER') {
    throw createError({ statusCode: 403, message: 'Only admins can create managers' })
  }

  const validation = validatePassword(password)
  if (!validation.valid) {
    throw createError({ statusCode: 400, message: validation.errors.join(', ') })
  }

  let hotelId: number | null = hotelIdParam
  if (user.role === 'MANAGER') {
    hotelId = user.hotelId ?? null
    if (!hotelId) {
      throw createError({ statusCode: 403, message: 'You are not assigned to a hotel' })
    }
  } else if (!hotelId) {
    throw createError({ statusCode: 400, message: 'hotelId required' })
  }

  const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } })
  if (!hotel) {
    throw createError({ statusCode: 404, message: 'Hotel not found' })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw createError({ statusCode: 409, message: 'Email already registered' })
  }

  const passwordHash = await hashPassword(password)

  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: role as any,
      hotelId,
      passwordChangedAt: new Date(),
    },
    select: { id: true, email: true, name: true, role: true, hotelId: true },
  })

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'STAFF_CREATE',
      details: `Created ${role} ${email} for hotel #${hotelId}`,
    },
  })

  return { user: created }
})
