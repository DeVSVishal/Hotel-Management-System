import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  if (event.context.user.id !== id) {
    throw createError({ statusCode: 403, statusMessage: 'You can only update your own profile' })
  }

  const { name, phone, password } = await readBody(event)

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (phone !== undefined) data.phone = phone

  if (password) {
    const validation = validatePassword(password)
    if (!validation.valid) {
      throw createError({ statusCode: 400, statusMessage: validation.errors.join(', ') })
    }
    data.passwordHash = await hashPassword(password)
    data.passwordChangedAt = new Date()
  }

  const user = await prisma.user.update({
    where: { id },
    data,
  })

  const { passwordHash, ...profile } = user
  return { user: profile }
})
