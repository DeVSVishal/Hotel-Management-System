<script setup lang="ts">
const { user } = useUserSession()

const navItems = computed(() => {
  if (!user.value) return []
  const role = user.value.role
  const items = []

  if (role === 'STAFF' || role === 'MANAGER' || role === 'ADMIN') {
    items.push({ label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/staff/dashboard' })
    items.push({ label: 'Bookings', icon: 'i-lucide-calendar-check', to: '/staff/bookings' })
    items.push({ label: 'Rooms', icon: 'i-lucide-door-open', to: '/staff/rooms' })
    items.push({ label: 'Services', icon: 'i-lucide-concierge-bell', to: '/staff/services' })
  }
  if (role === 'MANAGER' || role === 'ADMIN') {
    items.push({ label: 'Reports', icon: 'i-lucide-bar-chart-3', to: '/manager/reports' })
  }
  if (role === 'ADMIN') {
    items.push({ label: 'Users', icon: 'i-lucide-users', to: '/admin/users' })
    items.push({ label: 'Hotels', icon: 'i-lucide-building-2', to: '/admin/hotels' })
    items.push({ label: 'Audit Logs', icon: 'i-lucide-scroll-text', to: '/admin/audit-logs' })
  }

  return items
})

async function handleLogout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await useUserSession().fetch()
  navigateTo('/')
}
</script>

<template>
  <UDashboardSidebar collapsible resizable mode="slideover">
    <template #header="{ collapsed }">
      <div :class="collapsed ? 'justify-center' : 'justify-start'" class="flex items-center px-3 py-2">
        <NuxtLink to="/" :class="collapsed ? 'text-center' : ''" class="font-bold text-xl">
          {{ collapsed ? 'H' : 'HMS' }}
        </NuxtLink>
      </div>
    </template>

    <template #default="{ collapsed }">
      <UNavigationMenu
        :items="navItems"
        orientation="vertical"
        :collapsed="collapsed"
      />
    </template>

    <template #footer="{ collapsed }">
      <UButton
        :icon="collapsed ? 'i-lucide-log-out' : undefined"
        :label="collapsed ? undefined : 'Sign out'"
        color="neutral"
        variant="ghost"
        block
        @click="handleLogout"
      />
    </template>
  </UDashboardSidebar>
</template>
