<script setup lang="ts">
const route = useRoute()

defineProps<{
  showSidebarToggle?: boolean
}>()

const { loggedIn, user } = useUserSession()

const profileMenuItems = computed(() => [
  { label: user.value?.name, type: 'label' as const },
  { label: 'Profile', icon: 'i-lucide-user', to: '/guest/profile' },
  { label: 'My Bookings', icon: 'i-lucide-calendar-check', to: '/guest/bookings' },
  { label: 'Logout', icon: 'i-lucide-log-out', onSelect: handleLogout },
])

async function handleLogout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await useUserSession().fetch()
  navigateTo('/')
}

const isHome = computed(() => route.path === '/')
const isAuth = computed(() => ['/login', '/register'].includes(route.path))
const hideNav = computed(() => !loggedIn.value && (isHome.value || isAuth.value))
</script>

<template>
  <UDashboardNavbar v-if="!hideNav" class="border-b border-gray-200">
    <template #leading>
      <UDashboardSidebarCollapse v-if="showSidebarToggle" />
      <NuxtLink to="/" class="font-bold text-xl text-gray-900 ml-2">
        HMS
      </NuxtLink>
    </template>

    <template #right>
      <template v-if="!loggedIn">
        <UButton color="neutral" variant="ghost" to="/login">
          Sign In
        </UButton>
        <UButton color="primary" to="/register">
          Create Account
        </UButton>
      </template>

      <template v-else>
        <UDropdownMenu :items="profileMenuItems">
          <UButton color="neutral" variant="ghost" class="flex items-center gap-2">
            <UAvatar :alt="user?.name" size="sm" />
            <span class="hidden sm:inline text-sm">{{ user?.name }}</span>
          </UButton>
        </UDropdownMenu>
      </template>
    </template>
  </UDashboardNavbar>
</template>
