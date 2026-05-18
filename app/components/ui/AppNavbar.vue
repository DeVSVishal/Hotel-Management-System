<script setup lang="ts">
defineProps<{
  showSidebarToggle?: boolean
}>()

const route = useRoute()
const { loggedIn, user } = useUserSession()

const isAuth = computed(() => ['/login', '/register'].includes(route.path))

/* =======================================================
        Role-aware home target shown on the brand link
        and the prominent navbar CTA.
   ======================================================= */
const homeTarget = computed(() => {
  if (!loggedIn.value) return '/'
  const role = user.value?.role
  if (role === 'STAFF' || role === 'MANAGER' || role === 'ADMIN') return '/staff/dashboard'
  return '/guest/dashboard'
})

const showSearchLink = computed(() => loggedIn.value && user.value?.role === 'GUEST' && route.path !== '/')

async function handleLogout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await useUserSession().fetch()
  navigateTo('/')
}
</script>

<template>
  <nav
    v-if="!isAuth"
    class="border-b border-(--ui-border) bg-(--ui-bg) px-4 py-3 flex items-center justify-between"
  >
    <div class="flex items-center gap-3">
      <UDashboardSidebarCollapse v-if="showSidebarToggle" />
      <NuxtLink :to="homeTarget" class="flex items-center gap-2 font-bold text-lg text-(--ui-primary)">
        <UIcon name="i-lucide-hotel" class="h-5 w-5" />
        <span>Verdan Hotels</span>
      </NuxtLink>
    </div>

    <div class="flex items-center gap-2 flex-wrap justify-end">
      <template v-if="!loggedIn">
        <UButton color="neutral" variant="ghost" size="sm" to="/login">Sign In</UButton>
        <UButton color="primary" size="sm" to="/register">Create Account</UButton>
      </template>

      <template v-else>
        <UButton
          v-if="showSearchLink"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-search"
          to="/"
        >
          <span class="hidden sm:inline">Search rooms</span>
        </UButton>

        <UButton
          v-if="user?.role === 'GUEST'"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-calendar-days"
          to="/guest/bookings"
        >
          <span class="hidden sm:inline">My bookings</span>
        </UButton>

        <span class="hidden md:inline text-sm text-(--ui-text-muted)">{{ user?.name }}</span>
        <UBadge color="primary" variant="subtle" size="sm">{{ user?.role }}</UBadge>
        <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-user" to="/guest/profile" />
        <UButton
          color="error"
          variant="solid"
          size="sm"
          icon="i-lucide-log-out"
          @click="handleLogout"
        >
          <span class="hidden sm:inline">Logout</span>
        </UButton>
      </template>
    </div>
  </nav>
</template>
