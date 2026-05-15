import prisma from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  if (event.context.user.id === id) {
    throw createError({ statusCode: 400, statusMessage: 'You cannot delete yourself' })
  }

  await prisma.user.delete({ where: { id } })

  return { success: true }
})
