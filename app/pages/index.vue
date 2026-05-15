<script setup lang="ts">
const { loggedIn, user } = useUserSession()
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="mx-auto max-w-4xl px-4 py-16 text-center">
      <h1 class="text-4xl font-bold tracking-tight text-gray-900">
        Welcome to HMS
      </h1>
      <p class="mt-4 text-lg text-gray-600">
        Hotel Management System — find and book rooms across our London, Paris, and New York locations.
      </p>

      <div v-if="!loggedIn" class="mt-8 flex justify-center gap-4">
        <UButton color="primary" size="lg" to="/login">
          Sign In
        </UButton>
        <UButton color="neutral" variant="outline" size="lg" to="/register">
          Create Account
        </UButton>
      </div>
      <div v-else class="mt-8">
        <p class="text-gray-600">
          Signed in as <strong>{{ user?.name }}</strong>
        </p>
        <UButton class="mt-4" color="primary" size="lg" to="/guest/bookings">
          My Bookings
        </UButton>
      </div>
    </div>
  </div>
</template>
