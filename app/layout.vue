<script setup lang="ts">
const { loggedIn, user } = useUserSession()
const route = useRoute()

const isGuest = computed(() => loggedIn.value && user.value?.role === 'GUEST')
const showSidebar = computed(() => loggedIn.value && !isGuest.value)

const noLayoutPaths = ['/', '/login', '/register']
const useMinimal = computed(() => noLayoutPaths.includes(route.path))
</script>

<template>
  <div class="min-h-screen bg-gray-50">
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
