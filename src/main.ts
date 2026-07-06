import { createApp } from "vue"
import { IonicVue } from "@ionic/vue"

import App from "./App.vue"
import router from "./router"
import { authStore } from "./stores/auth"

/* Core CSS Ionic (wajib) */
import "@ionic/vue/css/core.css"
import "@ionic/vue/css/normalize.css"
import "@ionic/vue/css/structure.css"
import "@ionic/vue/css/typography.css"

/* Utilitas opsional Ionic */
import "@ionic/vue/css/padding.css"
import "@ionic/vue/css/float-elements.css"
import "@ionic/vue/css/text-alignment.css"
import "@ionic/vue/css/text-transformation.css"
import "@ionic/vue/css/flex-utils.css"
import "@ionic/vue/css/display.css"

/* Tema aplikasi */
import "./theme/variables.css"
import "./theme/app.css"

async function bootstrap() {
	try {
		await authStore.init()
	} catch (error) {
		console.error("[HRAttend] Gagal inisialisasi auth store:", error)
	}
	const app = createApp(App).use(IonicVue).use(router)
	await router.isReady()
	app.mount("#app")
}

bootstrap()
