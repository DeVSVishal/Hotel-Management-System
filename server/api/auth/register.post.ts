import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const { email, password, name } = await readBody(event)

  if (!email || !password || !name) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
  }

  const validation = validatePassword(password)
  if (!validation.valid) {
    throw createError({ statusCode: 400, statusMessage: validation.errors.join(', ') })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Email already registered' })
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: { email, passwordHash, name, role: 'GUEST' },
  })

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  }
})
