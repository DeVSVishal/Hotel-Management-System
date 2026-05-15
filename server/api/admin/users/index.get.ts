import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const { role } = getQuery(event)

  const users = await prisma.user.findMany({
    where: role ? { role: role as string } : undefined,
    orderBy: { createdAt: 'desc' },
  })

  return {
    users: users.map(({ passwordHash, ...u }) => u),
  }
})
