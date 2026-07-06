<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<ion-toolbar>
				<ion-title>Beranda</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content :fullscreen="true">
			<div class="page-pad">
				<div class="greet card">
					<div>
						<p class="muted" style="margin:0">Halo,</p>
						<h2 style="margin:2px 0 0">{{profile?.full_name}}</h2>
						<p class="muted" style="margin:2px 0 0;font-size:.8rem">
							{{profile?.division || 'Tanpa Divisi'}} · {{profile?.position || '-'}}
						</p>
					</div>
					<span class="badge" :class="'badge-' + (today?.status || 'absent')">
						{{statusLabel}}
					</span>
				</div>

				<div class="clock card text-center">
					<div class="time">{{clock}}</div>
					<div class="muted">{{dateStr}}</div>
				</div>

				<div class="grid-2" style="margin-top:12px">
					<div class="stat-card">
						<div class="muted label">Check-in</div>
						<div class="value">{{formatTime(today?.check_in_time || null)}}</div>
					</div>
					<div class="stat-card">
						<div class="muted label">Check-out</div>
						<div class="value">{{formatTime(today?.check_out_time || null)}}</div>
					</div>
				</div>

				<ion-button expand="block" class="cta" router-link="/app/absensi">
					<ion-icon slot="start" :icon="cameraOutline" />
					Ke Halaman Absensi
				</ion-button>

				<h3 class="section-title" style="margin-top:20px">Saldo Cuti</h3>
				<div v-if="balances.length === 0" class="muted" style="font-size:.85rem">
					Belum ada saldo cuti yang dialokasikan.
				</div>
				<div v-for="b in balances" :key="b.id" class="list-row">
					<span>{{b.leave_types?.name}}</span>
					<strong>{{b.remaining_days}} / {{b.total_days}} hari</strong>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue"
import {
	IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
} from "@ionic/vue"
import { cameraOutline } from "ionicons/icons"
import { authStore } from "@/stores/auth"
import { getTodayAttendance } from "@/composables/useAttendance"
import { getBalances } from "@/composables/useLeave"
import { formatTime } from "@/lib/datetime"
import { attendanceLabels } from "@/lib/status"
import type { Attendance, LeaveBalance } from "@/types/database"

const profile = computed(() => authStore.state.profile)
const today = ref<Attendance | null>(null)
const balances = ref<LeaveBalance[]>([])
const clock = ref("")
let timer: number | undefined

const dateStr = new Date().toLocaleDateString("id-ID", {
	weekday: "long", day: "numeric", month: "long", year: "numeric",
})

const statusLabel = computed(() =>
	today.value ? attendanceLabels[today.value.status] : "Belum Absen",
)

function tick() {
	clock.value = new Date().toLocaleTimeString("id-ID", {
		hour: "2-digit", minute: "2-digit", second: "2-digit",
	})
}

onMounted(async () => {
	tick()
	timer = window.setInterval(tick, 1000)
	const uid = authStore.state.userId
	if (uid) {
		today.value = await getTodayAttendance(uid)
		balances.value = await getBalances(uid)
	}
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.greet { display: flex; justify-content: space-between; align-items: flex-start; }
.clock { margin-top: 12px; }
.clock .time { font-family: "Outfit"; font-size: 2.6rem; font-weight: 700; }
.cta { margin-top: 16px; --border-radius: 14px; height: 50px; }
</style>
