// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  runtimeConfig: {
    public: {
      openai: process.env.NUXT_PUBLIC_OPENAI_KEY,
      apiKey: process.env.NUXT_PUBLIC_WEAVIATE_API_KEY,
      hostUrl: process.env.NUXT_PUBLIC_WEAVIATE_HOST_URL
    }
  }

})
