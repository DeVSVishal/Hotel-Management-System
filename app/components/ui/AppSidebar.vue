<script setup lang="ts">
const { user } = useUserSession()

/* =======================================================
        Build the role-grouped nav menu. Items are stacked
        from most specific (Dashboard) to least.
   ======================================================= */
const navItems = computed(() => {
  if (!user.value) return []
  const role = user.value.role
  const items: { label: string; icon: string; to: string }[] = []

  if (role === 'STAFF' || role === 'MANAGER' || role === 'ADMIN') {
    items.push({ label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/staff/dashboard' })
    items.push({ label: 'Bookings', icon: 'i-lucide-calendar-check', to: '/staff/bookings' })
    items.push({ label: 'Rooms', icon: 'i-lucide-door-open', to: '/staff/rooms' })
    items.push({ label: 'Services', icon: 'i-lucide-concierge-bell', to: '/staff/services' })
  }
  if (role === 'MANAGER' || role === 'ADMIN') {
    items.push({ label: 'Reports', icon: 'i-lucide-bar-chart-3', to: '/manager/reports' })
    items.push({ label: 'Rates', icon: 'i-lucide-tag', to: '/manager/rates' })
    items.push({ label: 'Staff', icon: 'i-lucide-user-cog', to: '/manager/staff' })
  }
  if (role === 'ADMIN') {
    items.push({ label: 'Users', icon: 'i-lucide-users', to: '/admin/users' })
    items.push({ label: 'Hotels', icon: 'i-lucide-building-2', to: '/admin/hotels' })
    items.push({ label: 'All Rooms', icon: 'i-lucide-door-closed', to: '/admin/rooms' })
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
        <NuxtLink to="/staff/dashboard" :class="collapsed ? 'text-center' : ''" class="font-bold text-lg text-(--ui-primary) flex items-center gap-2">
          <UIcon name="i-lucide-hotel" class="h-5 w-5 flex-shrink-0" />
          <span v-if="!collapsed">Verdan</span>
        </NuxtLink>
      </div>
    </template>

    <template #default="{ collapsed }">
      <UNavigationMenu
        :items="navItems"
        orientation="vertical"
        :collapsed="collapsed"
      />

      <div v-if="!collapsed && user?.hotelId" class="mt-4 mx-2 p-3 rounded-lg bg-(--ui-bg-muted) border border-(--ui-border)">
        <div class="text-[10px] uppercase tracking-wider text-muted">Hotel scope</div>
        <div class="text-xs font-medium mt-0.5">Hotel #{{ user.hotelId }}</div>
      </div>
    </template>

    <template #footer="{ collapsed }">
      <UButton
        :icon="collapsed ? 'i-lucide-log-out' : undefined"
        :label="collapsed ? undefined : 'Logout'"
        color="error"
        variant="solid"
        block
        @click="handleLogout"
      />
    </template>
  </UDashboardSidebar>
</template>
