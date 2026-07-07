<template>
	<ion-page>
		<ion-content :fullscreen="true" class="login-bg">
			<div class="login-wrap">
				<div class="brand">
					<div class="logo">
						<ion-icon :icon="fingerPrintOutline" />
					</div>
					<h1>HRAttend</h1>
					<p class="muted">Sistem Absensi & Manajemen Cuti</p>
				</div>

				<form class="login-card" @submit.prevent="onSubmit">
					<label class="form-label">Email</label>
					<ion-input
						v-model="email"
						type="email"
						fill="outline"
						placeholder="nama@perusahaan.com"
						required
					/>
					<label class="form-label">Kata Sandi</label>
					<ion-input
						v-model="password"
						type="password"
						fill="outline"
						placeholder="........"
						required
					/>

					<p v-if="errorMsg" class="err">{{errorMsg}}</p>

					<ion-button
						type="submit"
						expand="block"
						class="login-btn"
						:disabled="loading"
					>
						<ion-spinner v-if="loading" name="crescent" />
						<span v-else>Masuk</span>
					</ion-button>
				</form>

				<p class="hint muted">Gunakan akun yang didaftarkan oleh HRD.</p>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useRouter } from "vue-router"
import {
	IonPage,
	IonContent,
	IonInput,
	IonButton,
	IonIcon,
	IonSpinner,
} from "@ionic/vue"
import { fingerPrintOutline } from "ionicons/icons"
import { authStore } from "@/stores/auth"

const router = useRouter()
const email = ref("")
const password = ref("")
const errorMsg = ref<string | null>(null)
const loading = ref(false)

async function onSubmit() {
	errorMsg.value = null
	loading.value = true
	const err = await authStore.signIn(email.value.trim(), password.value)
	loading.value = false
	if (err) {
		errorMsg.value = "Email atau kata sandi salah."
		return
	}
	const role = authStore.state.profile?.role
	if (role === "admin") {
		router.replace("/admin/akun")
	} else if (role === "hrd") {
		router.replace("/hrd/beranda")
	} else {
		router.replace("/app/beranda")
	}
}
</script>

<style scoped>
.login-bg {
	--background:
		radial-gradient(circle at 30% 15%, rgba(108, 99, 255, 0.25), transparent 45%),
		radial-gradient(circle at 75% 85%, rgba(157, 123, 255, 0.2), transparent 45%),
		var(--bg);
}
.login-wrap {
	min-height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding: 24px;
	gap: 24px;
}
.brand { text-align: center; }
.brand .logo {
	width: 76px;
	height: 76px;
	margin: 0 auto 14px;
	border-radius: 22px;
	background: var(--primary-grad);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 12px 32px -8px rgba(108, 99, 255, 0.7);
}
.brand .logo ion-icon { font-size: 2.4rem; color: #fff; }
.brand h1 { font-family: "Outfit"; margin: 0; font-size: 1.8rem; }
.login-card {
	background: var(--surface);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	padding: 20px;
}
.login-btn { margin-top: 20px; --border-radius: 12px; height: 48px; }
.err { color: var(--danger); font-size: 0.85rem; margin: 12px 4px 0; }
.hint { text-align: center; font-size: 0.8rem; }
</style>
