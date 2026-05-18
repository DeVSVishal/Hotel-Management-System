import prisma from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  const id = Number(getRouterParam(event, 'id'))

  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid user id' })
  }

  if (id === user.id) {
    throw createError({ statusCode: 400, message: 'Cannot remove yourself' })
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, hotelId: true },
  })

  if (!target) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  if (!['STAFF', 'MANAGER'].includes(target.role)) {
    throw createError({ statusCode: 400, message: 'Can only remove staff or manager accounts' })
  }

  if (user.role === 'MANAGER') {
    if (!user.hotelId || target.hotelId !== user.hotelId) {
      throw createError({ statusCode: 403, message: 'Staff does not belong to your hotel' })
    }
    if (target.role === 'MANAGER') {
      throw createError({ statusCode: 403, message: 'Only admins can remove managers' })
    }
  }

  await prisma.user.delete({ where: { id } })

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'STAFF_REMOVE',
      details: `Removed ${target.role} ${target.email}`,
    },
  })

  return { ok: true }
})
