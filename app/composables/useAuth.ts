export function useAuth() {
  const session = useUserSession()

  const userRole = computed(() => session.user.value?.role)

  const isGuest = computed(() => session.loggedIn.value && userRole.value === 'GUEST')
  const isStaff = computed(() => session.loggedIn.value && userRole.value === 'STAFF')
  const isManager = computed(() => session.loggedIn.value && userRole.value === 'MANAGER')
  const isAdmin = computed(() => session.loggedIn.value && userRole.value === 'ADMIN')

  const isStaffOrAbove = computed(() => session.loggedIn.value && ['STAFF', 'MANAGER', 'ADMIN'].includes(userRole.value ?? ''))
  const isManagerOrAbove = computed(() => session.loggedIn.value && ['MANAGER', 'ADMIN'].includes(userRole.value ?? ''))

  async function login(email: string, password: string) {
    await $fetch('/api/auth/login', { method: 'POST', body: { email, password } })
    await session.fetch()
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await session.fetch()
  }

  async function register(name: string, email: string, password: string) {
    await $fetch('/api/auth/register', { method: 'POST', body: { name, email, password } })
  }

  return {
    ...session,
    isGuest,
    isStaff,
    isManager,
    isAdmin,
    isStaffOrAbove,
    isManagerOrAbove,
    login,
    logout,
    register,
  }
}
