<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<ion-toolbar>
				<ion-title>Monitor Absensi</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content :fullscreen="true">
			<div class="page-pad">
				<div class="toolbar-row">
					<ion-input v-model="date" type="date" fill="outline" @ionChange="load" />
					<ion-button fill="outline" size="small" @click="exportCsv">
						<ion-icon slot="start" :icon="downloadOutline" /> CSV
					</ion-button>
				</div>

				<ion-select v-model="statusFilter" interface="popover" placeholder="Semua status" class="filter-select" @ionChange="() => {}">
					<ion-select-option value="all">Semua Status</ion-select-option>
					<ion-select-option value="present">Hadir</ion-select-option>
					<ion-select-option value="late">Terlambat</ion-select-option>
					<ion-select-option value="absent">Alpha</ion-select-option>
					<ion-select-option value="on_leave">Cuti</ion-select-option>
				</ion-select>

				<div v-if="filtered.length === 0" class="empty-state">
					<ion-icon :icon="listOutline" />
					<p>Belum ada data untuk tanggal ini.</p>
				</div>

				<div v-for="r in filtered" :key="r.id" class="list-row">
					<div style="display:flex;align-items:center;gap:10px">
						<img v-if="r.check_in_photo_url" :src="r.check_in_photo_url" class="thumb" @click="preview(r.check_in_photo_url)" />
						<div v-else class="thumb no-photo"><ion-icon :icon="personOutline" /></div>
						<div>
							<strong>{{r.profiles?.full_name || '-'}}</strong>
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
	IonInput, IonButton, IonIcon, IonSelect, IonSelectOption, alertController,
} from "@ionic/vue"
import { downloadOutline, listOutline, personOutline } from "ionicons/icons"
import { getAttendanceByDate } from "@/composables/useAdmin"
import { todayISO, formatTime } from "@/lib/datetime"
import { attendanceLabels } from "@/lib/status"
import type { Attendance } from "@/types/database"

const date = ref(todayISO())
const rows = ref<Attendance[]>([])
const statusFilter = ref("all")

const filtered = computed(() =>
	statusFilter.value === "all"
		? rows.value
		: rows.value.filter((r) => r.status === statusFilter.value),
)

async function load() {
	rows.value = await getAttendanceByDate(date.value)
}

async function preview(url: string) {
	const a = await alertController.create({
		header: "Foto Selfie",
		message: `<img src="${url}" style="width:100%;border-radius:12px" />`,
		buttons: ["Tutup"],
	})
	await a.present()
}

function exportCsv() {
	const header = "Nama,NIK,Divisi,Tanggal,Masuk,Pulang,Status\n"
	const body = rows.value
		.map((r) =>
			[
				r.profiles?.full_name ?? "",
				r.profiles?.nik ?? "",
				r.profiles?.division ?? "",
				r.date,
				formatTime(r.check_in_time),
				formatTime(r.check_out_time),
				attendanceLabels[r.status],
			].join(","),
		)
		.join("\n")
	const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" })
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.href = url
	a.download = `absensi-${date.value}.csv`
	a.click()
	URL.revokeObjectURL(url)
}

onMounted(load)
</script>

<style scoped>
.toolbar-row { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; }
.toolbar-row ion-input { flex: 1; }
.filter-select { background: var(--surface); border-radius: 12px; padding: 4px 12px; margin-bottom: 12px; }
.no-photo { display: flex; align-items: center; justify-content: center; background: var(--surface-3); color: var(--text-3); }
</style>
