export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  modules: [
    "@nuxt/eslint",
    "@nuxt/hints",
    "@nuxt/image",
    "@nuxt/test-utils",
    "@nuxt/ui",
    "nuxt-auth-utils",
    "@nuxt/fonts",
    "@nuxt/icon",
  ],
  css: ["~/assets/css/main.css"],

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
