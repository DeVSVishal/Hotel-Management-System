import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (event.context.user.id !== id) {
    throw createError({ statusCode: 403, statusMessage: 'You can only update your own profile' })
  }

  const { name, phone, password, currentPassword } = await readBody(event)

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (phone !== undefined) data.phone = phone

  if (password) {
    if (!currentPassword) {
      throw createError({ statusCode: 400, statusMessage: 'Current password is required to set a new password' })
    }

    const valid = await verifyPassword(existing.passwordHash, currentPassword)
    if (!valid) {
      throw createError({ statusCode: 400, statusMessage: 'Current password is incorrect' })
    }

    const validation = validatePassword(password)
    if (!validation.valid) {
      throw createError({ statusCode: 400, statusMessage: validation.errors.join(', ') })
    }
    data.passwordHash = await hashPassword(password)
    data.passwordChangedAt = new Date()
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
  })

  const { passwordHash: _ph, ...profile } = updated
  return { user: profile }
})
