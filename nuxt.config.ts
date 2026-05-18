export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  components: [
    { path: '~/components', pathPrefix: false },
  ],

  modules: [
    "@nuxt/eslint",
    "@nuxt/image",
    "@nuxt/test-utils",
    "@nuxt/ui",
    "nuxt-auth-utils",
    "@nuxt/fonts",
    "@nuxt/icon",
  ],
  css: ["~/assets/css/main.css"],

  /* =======================================================
        Force light mode app-wide. Nuxt UI ships
        @nuxtjs/color-mode, which by default follows the
        OS preference and applies a .dark class to <html>.
        We pin it to light so the white + emerald palette
        always wins regardless of the visitor's system.
     ======================================================= */
  colorMode: {
    preference: 'light',
    fallback: 'light',
    classSuffix: '',
  },

  fonts: {
    families: [
      { name: "Inter", provider: "google" },
    ],
    defaults: {
      weights: [400, 500, 600, 700],
    },
  },

  nitro: {
    externals: {
      inline: [],
      external: ["@prisma/client"],
    },
  },
});
