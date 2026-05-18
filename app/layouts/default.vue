<script setup lang="ts">
const { loggedIn, user } = useUserSession()
const route = useRoute()

const IDLE_TIMEOUT_MS = 15 * 60 * 1000
const lastActivity = ref(Date.now())

function resetIdleTimer() {
  lastActivity.value = Date.now()
}

if (typeof window !== 'undefined') {
  const events = ['mousedown', 'keydown', 'click', 'touchstart', 'scroll']
  for (const ev of events) {
    window.addEventListener(ev, resetIdleTimer)
  }

  setInterval(async () => {
    if (loggedIn.value && Date.now() - lastActivity.value > IDLE_TIMEOUT_MS) {
      await $fetch('/api/auth/logout', { method: 'POST' })
      await useUserSession().fetch()
      navigateTo('/login')
    }
  }, 60_000)
}

const isGuest = computed(() => loggedIn.value && user.value?.role === 'GUEST')
const showSidebar = computed(() => loggedIn.value && !isGuest.value)

const noLayoutPaths = ['/', '/login', '/register', '/change-password']
const useMinimal = computed(() => noLayoutPaths.includes(route.path))
</script>

<template>
  <div class="min-h-screen bg-(--ui-bg)">
    <template v-if="useMinimal">
      <AppNavbar />
      <main class="p-4">
        <slot />
      </main>
    </template>

    <template v-else-if="showSidebar">
      <UDashboardGroup>
        <AppSidebar />

        <UDashboardPanel>
          <template #header>
            <AppNavbar show-sidebar-toggle />
          </template>

          <template #body>
            <main class="p-6">
              <slot />
            </main>
          </template>
        </UDashboardPanel>
      </UDashboardGroup>
    </template>

    <template v-else>
      <AppNavbar />
      <UContainer class="py-4">
        <slot />
      </UContainer>
    </template>
  </div>
</template>
