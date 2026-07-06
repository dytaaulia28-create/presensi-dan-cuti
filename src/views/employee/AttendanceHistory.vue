<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<ion-toolbar>
				<ion-title>Riwayat Absensi</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content :fullscreen="true">
			<div class="page-pad">
				<div class="filter">
					<ion-select v-model="month" interface="popover" label="Bulan" @ionChange="load">
						<ion-select-option v-for="(m, i) in months" :key="i" :value="i + 1">{{m}}</ion-select-option>
					</ion-select>
					<ion-select v-model="year" interface="popover" label="Tahun" @ionChange="load">
						<ion-select-option v-for="y in years" :key="y" :value="y">{{y}}</ion-select-option>
					</ion-select>
				</div>

				<div class="grid-2" style="margin:12px 0">
					<div class="stat-card"><div class="value">{{summary.present}}</div><div class="label muted">Hadir</div></div>
					<div class="stat-card"><div class="value">{{summary.late}}</div><div class="label muted">Terlambat</div></div>
				</div>

				<div v-if="rows.length === 0" class="empty-state">
					<ion-icon :icon="documentTextOutline" />
					<p>Belum ada data absensi bulan ini.</p>
				</div>

				<div v-for="r in rows" :key="r.id" class="list-row">
					<div style="display:flex;align-items:center;gap:10px">
						<img v-if="r.check_in_photo_url" :src="r.check_in_photo_url" class="thumb" @click="preview(r.check_in_photo_url)" />
						<div>
							<strong>{{formatDate(r.date)}}</strong>
							<div class="muted" style="font-size:.75rem">
								{{formatTime(r.check_in_time)}} - {{formatTime(r.check_out_time)}}
							</div>
						</div>
					</div>
					<span class="badge" :class="'badge-' + r.status">{{attendanceLabels[r.status]}}</span>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import {
	IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
	IonSelect, IonSelectOption, IonIcon, alertController,
} from "@ionic/vue"
import { documentTextOutline } from "ionicons/icons"
import { getMonthlyAttendance } from "@/composables/useAttendance"
import { authStore } from "@/stores/auth"
import { formatDate, formatTime } from "@/lib/datetime"
import { attendanceLabels } from "@/lib/status"
import type { Attendance } from "@/types/database"

const now = new Date()
const month = ref(now.getMonth() + 1)
const year = ref(now.getFullYear())
const rows = ref<Attendance[]>([])
const months = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]
const years = [now.getFullYear(), now.getFullYear() - 1]

const summary = computed(() => ({
	present: rows.value.filter((r) => r.status === "present").length,
	late: rows.value.filter((r) => r.status === "late").length,
}))

async function load() {
	const uid = authStore.state.userId
	if (!uid) return
	rows.value = await getMonthlyAttendance(uid, year.value, month.value)
}

async function preview(url: string) {
	const a = await alertController.create({
		header: "Foto Absensi",
		message: `<img src="${url}" style="width:100%;border-radius:12px" />`,
		buttons: ["Tutup"],
	})
	await a.present()
}

onMounted(load)
</script>

<style scoped>
.filter { display: flex; gap: 10px; }
.filter ion-select { flex: 1; background: var(--surface); border-radius: 12px; padding: 4px 10px; }
</style>
