<script setup lang="ts">
/* =======================================================
        Force-pin light mode site-wide.
        Nuxt UI ships @nuxtjs/color-mode which still
        toggles a .dark class on <html> based on stored
        prefs / system. We strip it on every render and
        wipe any saved preference in localStorage so the
        page never flashes dark.
   ======================================================= */
if (import.meta.client) {
  try {
    localStorage.removeItem('nuxt-color-mode')
  } catch {}
  document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = 'light'

  const obs = new MutationObserver(() => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark')
    }
  })
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
}

useHead({
  htmlAttrs: { lang: 'en', class: 'light' },
  meta: [{ name: 'color-scheme', content: 'light' }],
})
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
