import { getRequestIP } from 'h3'
import prisma from '../utils/prisma'

/* =======================================================
        Paths that skip authentication entirely
   ======================================================= */
const PUBLIC_PATHS = ['/api/auth', '/api/hotels', '/api/rooms']

export default defineEventHandler(async (event) => {
  const path = event.path

  if (path === '/' || PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    return
  }

  if (!path.startsWith('/api')) {
    return
  }

  const { user } = await getUserSession(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  event.context.user = user

  /* =======================================================
              Role-based access control
     ======================================================= */
  if (path.startsWith('/api/admin') && user.role !== 'ADMIN') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  if (
    path.startsWith('/api/manager') &&
    !['MANAGER', 'ADMIN'].includes(user.role)
  ) {
    throw createError({ statusCode: 403, message: 'Manager access required' })
  }

  if (
    path.startsWith('/api/staff') &&
    !['STAFF', 'MANAGER', 'ADMIN'].includes(user.role)
  ) {
    throw createError({ statusCode: 403, message: 'Staff access required' })
  }

  /* =======================================================
        Audit-log every authenticated API call.
        Required by coursework spec for security audit.
   ======================================================= */
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'API_ACCESS',
      details: `${event.method} ${path}`,
      ipAddress: getRequestIP(event),
    },
  })
})
