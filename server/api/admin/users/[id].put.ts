import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const body = await readBody(event)
  const currentUser = event.context.user

  if (body.role && body.role !== 'ADMIN' && currentUser.id === id) {
    throw createError({ statusCode: 400, statusMessage: 'You cannot demote yourself from ADMIN' })
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.email !== undefined) data.email = body.email
  if (body.role !== undefined) data.role = body.role
  if (body.phone !== undefined) data.phone = body.phone
  if (body.unlock) {
    data.failedLoginAttempts = 0
    data.lockedUntil = null
  }

  const updated = await prisma.user.update({ where: { id }, data })

  const { passwordHash, ...profile } = updated
  return { user: profile }
})
