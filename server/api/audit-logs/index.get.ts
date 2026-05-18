import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user

  if (user.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const query = getQuery(event)
  const action = query.action ? String(query.action) : null
  const userId = query.userId ? Number(query.userId) : null
  const startDate = query.startDate ? new Date(String(query.startDate)) : null
  const endDate = query.endDate ? new Date(String(query.endDate)) : null
  const page = Math.max(1, Number(query.page ?? 1))
  const pageSize = Math.min(100, Math.max(10, Number(query.pageSize ?? 50)))

  const where: any = {}
  if (action) where.action = action
  if (userId) where.userId = userId
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = startDate
    if (endDate) where.createdAt.lte = endDate
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    logs,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  }
})
