<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<ion-toolbar>
				<ion-title>Absensi</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content :fullscreen="true">
			<div class="page-pad">
				<!-- TAMPILAN LOCKOUT JIKA BELUM ABSEN PULANG HARI SEBELUMNYA -->
				<div v-if="isLockedOut" class="done card text-center" style="border-color: var(--danger); margin-bottom:14px">
					<ion-icon :icon="alertCircleOutline" style="color: var(--danger); font-size:3rem" />
					<p style="color: var(--danger); font-weight:600; font-size:1.1rem; margin-top:8px">Absensi Terkunci</p>
					<p class="muted" style="font-size:.85rem; margin-top:4px">
						Anda tidak dapat melakukan absensi karena belum melakukan absen pulang pada hari sebelumnya. Silakan hubungi HRD.
					</p>
				</div>

				<div v-else>
					<!-- Status waktu hari ini -->
					<div class="status-banner card" :class="bannerClass">
						<ion-icon :icon="timeOutline" />
						<div>
							<strong>{{ demoMode ? simTime : serverClock }}</strong>
							<div class="muted" style="font-size:.78rem">{{ phaseText }}</div>
						</div>
					</div>

					<!-- Kontrol Mode Demo -->
					<div class="card" style="margin-bottom:14px; padding:12px">
						<div style="display:flex; justify-content:space-between; align-items:center">
							<strong>Mode Demo (Prototype)</strong>
							<ion-toggle :checked="demoMode" @ionChange="demoMode = $event.detail.checked"></ion-toggle>
						</div>
						<div v-if="demoMode" style="margin-top:10px">
							<label class="form-label" style="margin-top:0">Simulasikan Jam Absen</label>
							<ion-input type="time" v-model="simTime" fill="outline" style="--padding-start:8px; margin-top:4px"></ion-input>
						</div>
					</div>

					<!-- Preview kamera / hasil selfie -->
					<div class="cam-box" v-if="!alreadyCheckedOut">
						<video
							v-show="!captured"
							ref="videoEl"
							class="selfie-preview mirror"
							playsinline
							muted
						></video>
						<img
							v-if="captured"
							:src="capturedUrl"
							class="selfie-preview"
							alt="Selfie"
						/>
						<canvas ref="canvasEl" hidden></canvas>
					</div>

					<p v-if="camError" class="err">{{ camError }}</p>

					<!-- Kontrol kamera -->
					<div class="controls" v-if="!alreadyCheckedOut">
						<ion-button
							v-if="!camActive && !captured"
							expand="block"
							fill="outline"
							@click="openCamera"
						>
							<ion-icon slot="start" :icon="cameraOutline" /> Buka Kamera
						</ion-button>

						<ion-button
							v-if="camActive && !captured"
							expand="block"
							@click="takePhoto"
						>
							<ion-icon slot="start" :icon="cameraOutline" /> Ambil Selfie
						</ion-button>

						<ion-button
							v-if="captured"
							expand="block"
							fill="outline"
							@click="retake"
						>
							<ion-icon slot="start" :icon="refreshOutline" /> Ulangi
						</ion-button>
					</div>

					<!-- Aksi absen -->
					<ion-button
						v-if="captured && !alreadyCheckedIn"
						expand="block"
						class="submit-btn"
						:disabled="submitting"
						@click="submitCheckIn"
					>
						<ion-spinner v-if="submitting" name="crescent" />
						<span v-else>Absen Masuk Sekarang</span>
					</ion-button>

					<ion-button
						v-if="alreadyCheckedIn && !alreadyCheckedOut"
						expand="block"
						color="medium"
						class="submit-btn"
						:disabled="submitting"
						@click="submitCheckOut"
					>
						<ion-spinner v-if="submitting" name="crescent" />
						<span v-else>Absen Pulang (Check-out)</span>
					</ion-button>

					<div v-if="alreadyCheckedOut" class="done card text-center">
						<ion-icon :icon="checkmarkCircleOutline" />
						<p>Absensi hari ini sudah lengkap. Terima kasih!</p>
					</div>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue"
import {
	IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
	IonButton, IonIcon, IonSpinner, IonToggle, IonInput, toastController,
} from "@ionic/vue"
import {
	cameraOutline, refreshOutline, timeOutline, checkmarkCircleOutline, alertCircleOutline,
} from "ionicons/icons"
import { useCamera } from "@/composables/useCamera"
import {
	performCheckIn, performCheckOut, getTodayAttendance, getDefaultShift, checkUncompletedCheckOut,
} from "@/composables/useAttendance"
import { authStore } from "@/stores/auth"
import type { WorkShift } from "@/types/database"

const videoEl = ref<HTMLVideoElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const { error: camError, active: camActive, start, capture, stop } = useCamera()

const captured = ref(false)
const capturedUrl = ref("")
const capturedBlob = ref<Blob | null>(null)
const submitting = ref(false)
const alreadyCheckedIn = ref(false)
const alreadyCheckedOut = ref(false)
const isLockedOut = ref(false)
const shift = ref<WorkShift | null>(null)
const serverClock = ref("")
let timer: number | undefined

// Demo Mode
const demoMode = ref(false)
const simTime = ref("09:30")

const phaseText = computed(() => {
	const t = demoMode.value ? simTime.value + ":00" : new Date().toTimeString().slice(0, 8)
	// Absen masuk: jam 9 - 10 pagi
	if (!alreadyCheckedIn.value) {
		if (t < "09:00:00" || t > "10:00:00") return "Di luar jam absensi (Terlambat)"
		return "Masih dalam waktu tepat (09:00 - 10:00)"
	} else {
		// Absen pulang: jam 5 sore - 6 sore
		if (t < "17:00:00") return "Belum jam absen pulang (Mulai 17:00)"
		if (t > "18:00:00") return "Batas absen pulang terlewat (Batas 18:00)"
		return "Waktu absen pulang (17:00 - 18:00)"
	}
})

const bannerClass = computed(() => {
	const t = demoMode.value ? simTime.value + ":00" : new Date().toTimeString().slice(0, 8)
	if (!alreadyCheckedIn.value) {
		if (t < "09:00:00" || t > "10:00:00") return "banner-danger"
		return "banner-ok"
	} else {
		if (t < "17:00:00" || t > "18:00:00") return "banner-danger"
		return "banner-ok"
	}
})

async function openCamera() {
	if (videoEl.value) await start(videoEl.value)
}

async function takePhoto() {
	if (!videoEl.value || !canvasEl.value) return
	const blob = await capture(videoEl.value, canvasEl.value)
	if (blob) {
		capturedBlob.value = blob
		capturedUrl.value = URL.createObjectURL(blob)
		captured.value = true
		stop()
	}
}

function retake() {
	captured.value = false
	capturedBlob.value = null
	openCamera()
}

async function toast(msg: string, color = "primary") {
	const t = await toastController.create({ message: msg, duration: 2800, color, position: "top" })
	await t.present()
}

async function submitCheckIn() {
	const uid = authStore.state.userId
	if (!uid || !capturedBlob.value) return
	submitting.value = true
	const t = demoMode.value ? simTime.value + ":00" : undefined
	const res = await performCheckIn(uid, capturedBlob.value, t)
	submitting.value = false
	await toast(res.message, res.ok ? "success" : "danger")
	if (res.ok) await refresh()
}

async function submitCheckOut() {
	const uid = authStore.state.userId
	if (!uid) return
	submitting.value = true
	const t = demoMode.value ? simTime.value + ":00" : undefined
	const res = await performCheckOut(uid, capturedBlob.value, t)
	submitting.value = false
	await toast(res.message, res.ok ? "success" : "danger")
	if (res.ok) await refresh()
}

async function refresh() {
	const uid = authStore.state.userId
	if (!uid) return
	isLockedOut.value = await checkUncompletedCheckOut(uid)
	const att = await getTodayAttendance(uid)
	alreadyCheckedIn.value = !!att?.check_in_time
	alreadyCheckedOut.value = !!att?.check_out_time
	captured.value = false
	capturedBlob.value = null
}

onMounted(async () => {
	shift.value = await getDefaultShift()
	await refresh()
	serverClock.value = new Date().toLocaleTimeString("id-ID")
	timer = window.setInterval(() => {
		serverClock.value = new Date().toLocaleTimeString("id-ID")
	}, 1000)
})

onUnmounted(() => {
	stop()
	clearInterval(timer)
})
</script>

<style scoped>
.status-banner {
	display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
}
.status-banner ion-icon { font-size: 1.8rem; }
.banner-ok { border-color: rgba(76,175,80,.4); }
.banner-warn { border-color: rgba(255,152,0,.5); }
.banner-danger { border-color: rgba(244,67,54,.5); }
.cam-box { margin-bottom: 14px; }
.mirror { transform: scaleX(-1); }
.controls { margin-bottom: 8px; }
.submit-btn { margin-top: 6px; height: 50px; --border-radius: 14px; }
.err { color: var(--danger); font-size: .85rem; }
.done ion-icon { font-size: 3rem; color: var(--success); }
</style>
