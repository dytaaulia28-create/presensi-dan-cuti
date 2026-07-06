<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<ion-toolbar>
				<ion-title>Pengaturan</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content :fullscreen="true">
			<div class="page-pad" v-if="shift">
				<h3 class="section-title">Jam Kerja / Shift</h3>
				<div class="card">
					<label class="form-label">Nama Shift</label>
					<ion-input v-model="shift.name" fill="outline" />
					<label class="form-label">Check-in dibuka</label>
					<ion-input v-model="shift.check_in_start" type="time" fill="outline" />
					<label class="form-label">Batas tepat waktu (lewat = Terlambat)</label>
					<ion-input v-model="shift.late_threshold" type="time" fill="outline" />
					<label class="form-label">Batas akhir check-in (lewat = Alpha)</label>
					<ion-input v-model="shift.check_in_deadline" type="time" fill="outline" />
					<label class="form-label">Jam pulang</label>
					<ion-input v-model="shift.check_out_time" type="time" fill="outline" />

					<ion-button expand="block" style="margin-top:18px" :disabled="saving" @click="save">
						<ion-spinner v-if="saving" name="crescent" />
						<span v-else>Simpan Pengaturan</span>
					</ion-button>
				</div>

				<div class="info-note">
					<ion-icon :icon="informationCircleOutline" />
					<span>Waktu absensi divalidasi di sisi server sehingga tidak dapat dimanipulasi dengan mengubah jam perangkat karyawan.</span>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import {
	IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
	IonInput, IonButton, IonIcon, IonSpinner, toastController,
} from "@ionic/vue"
import { informationCircleOutline } from "ionicons/icons"
import { getDefaultShift } from "@/composables/useAttendance"
import { supabase } from "@/lib/supabase"
import type { WorkShift } from "@/types/database"

const shift = ref<WorkShift | null>(null)
const saving = ref(false)

async function save() {
	if (!shift.value) return
	saving.value = true
	const { error } = await supabase
		.from("work_shifts")
		.update({
			name: shift.value.name,
			check_in_start: shift.value.check_in_start,
			late_threshold: shift.value.late_threshold,
			check_in_deadline: shift.value.check_in_deadline,
			check_out_time: shift.value.check_out_time,
		})
		.eq("id", shift.value.id)
	saving.value = false
	const t = await toastController.create({
		message: error ? error.message : "Pengaturan tersimpan.",
		duration: 2000,
		color: error ? "danger" : "success",
		position: "top",
	})
	await t.present()
}

onMounted(async () => {
	shift.value = await getDefaultShift()
})
</script>

<style scoped>
.info-note {
	display: flex; gap: 8px; align-items: flex-start;
	background: var(--primary-soft); border-radius: 12px;
	padding: 12px; font-size: .8rem; margin-top: 16px;
}
.info-note ion-icon { font-size: 1.2rem; color: var(--primary); flex-shrink: 0; }
</style>
