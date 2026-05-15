import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event)

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
    throw createError({ statusCode: 423, statusMessage: `Account locked. Try again in ${minutes} minute(s).` })
  }

  const valid = await verifyPassword(user.passwordHash, password)
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1

    if (attempts >= 5) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
        },
      })
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts },
      })
    }

    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  })

  await replaceUserSession(event, {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })

  await prisma.auditLog.create({
    data: { userId: user.id, action: 'LOGIN', ipAddress: getIP(event) },
  })

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  }
})
