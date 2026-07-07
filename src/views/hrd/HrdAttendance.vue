<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<ion-toolbar>
				<ion-title>Monitor Presensi</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content :fullscreen="true">
			<div class="page-pad">
				<!-- Dropdown Nama Karyawan (Drag Down) -->
				<label class="form-label">Pilih Karyawan</label>
				<ion-select
					v-model="selectedEmployeeId"
					placeholder="Pilih Karyawan..."
					class="filter-select field"
					interface="action-sheet"
					@ionChange="onEmployeeChange"
				>
					<ion-select-option v-for="e in employees" :key="e.id" :value="e.id">
						{{ e.full_name }} ({{ e.nik }})
					</ion-select-option>
				</ion-select>

				<!-- Jika belum memilih karyawan -->
				<div v-if="!selectedEmployeeId" class="empty-state">
					<ion-icon :icon="peopleOutline" />
					<p>Pilih karyawan di atas untuk melihat detail absensi.</p>
				</div>

				<!-- Jika karyawan sudah dipilih -->
				<div v-else>
					<!-- Tombol Nama Karyawan untuk detail data diri -->
					<div class="card emp-btn-card" @click="showDetailModal = true">
						<div class="emp-btn-content">
							<div class="avatar">{{ initials(selectedEmployee?.full_name || '?') }}</div>
							<div style="flex:1">
								<h3 style="margin:0; font-weight:700; color:var(--primary)">
									{{ selectedEmployee?.full_name }}
								</h3>
								<p class="muted" style="margin:2px 0 0; font-size:.8rem">
									NIK: {{ selectedEmployee?.nik }} · {{ selectedEmployee?.division || 'Tanpa Divisi' }}
								</p>
							</div>
							<ion-icon :icon="chevronForwardOutline" class="muted" />
						</div>
						<p class="tap-hint">Klik nama untuk melihat data diri lengkap</p>
					</div>

					<!-- Ringkasan Kehadiran Bulan Ini -->
					<h3 class="section-title" style="margin-top:16px">Rekap Kehadiran Bulan Ini</h3>
					<div class="grid-2">
						<div class="summary-box"><div class="num text-success">{{ counts.present }}</div><div class="lbl">Hadir</div></div>
						<div class="summary-box"><div class="num text-warning">{{ counts.late }}</div><div class="lbl">Terlambat</div></div>
						<div class="summary-box"><div class="num text-danger">{{ counts.sick }}</div><div class="lbl">Sakit</div></div>
						<div class="summary-box"><div class="num text-info">{{ counts.leave }}</div><div class="lbl">Cuti</div></div>
					</div>

					<!-- Riwayat Kehadiran -->
					<h3 class="section-title" style="margin-top:16px">Riwayat Presensi</h3>
					<div v-if="attendanceHistory.length === 0" class="empty-state">
						<ion-icon :icon="listOutline" />
						<p>Belum ada riwayat absensi bulan ini.</p>
					</div>

					<div v-for="r in attendanceHistory" :key="r.id" class="list-row">
						<div>
							<strong>{{ formatDate(r.date) }}</strong>
							<div class="muted" style="font-size:.75rem">
								Masuk: {{ formatTime(r.check_in_time) }} · Pulang: {{ formatTime(r.check_out_time) }}
							</div>
						</div>
						<span class="badge" :class="'badge-' + r.status">{{ attendanceLabels[r.status] }}</span>
					</div>
				</div>

				<!-- MODAL DETAIL DATA DIRI KARYAWAN -->
				<ion-modal :is-open="showDetailModal" @didDismiss="showDetailModal = false">
					<ion-header class="ion-no-border">
						<ion-toolbar>
							<ion-title>Data Diri Karyawan</ion-title>
							<ion-buttons slot="end">
								<ion-button @click="showDetailModal = false">Tutup</ion-button>
							</ion-buttons>
						</ion-toolbar>
					</ion-header>
					<ion-content class="ion-padding">
						<div class="prof text-center" style="margin-bottom:20px">
							<div class="avatar-large">{{ initials(selectedEmployee?.full_name || '?') }}</div>
							<h2 style="margin:12px 0 2px">{{ selectedEmployee?.full_name }}</h2>
							<p class="muted" style="margin:0">{{ selectedEmployee?.position || 'Karyawan' }}</p>
						</div>

						<div class="card">
							<div class="detail-row"><span class="muted">NIK</span><strong>{{ selectedEmployee?.nik }}</strong></div>
							<div class="detail-row"><span class="muted">Divisi</span><strong>{{ selectedEmployee?.division || '-' }}</strong></div>
							<div class="detail-row"><span class="muted">Role</span><strong>{{ selectedEmployee?.role === 'admin' ? 'Admin' : selectedEmployee?.role === 'hrd' ? 'HRD' : 'Karyawan' }}</strong></div>
							<div class="detail-row"><span class="muted">Jenis Kelamin</span><strong>{{ selectedEmployee?.gender === 'female' ? 'Perempuan' : 'Laki-laki' }}</strong></div>
							<div class="detail-row"><span class="muted">Tanggal Bergabung</span><strong>{{ formatDate(selectedEmployee?.joined_at || '') }}</strong></div>
							<div class="detail-row"><span class="muted">Status Akun</span><strong>
								<span :style="{ color: selectedEmployee?.is_active ? 'var(--success)' : 'var(--danger)' }">
									{{ selectedEmployee?.is_active ? 'Aktif' : 'Non-aktif' }}
								</span>
							</strong></div>
						</div>
					</ion-content>
				</ion-modal>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import {
	IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
	IonSelect, IonSelectOption, IonModal, IonButtons, IonButton, IonIcon,
} from "@ionic/vue"
import {
	peopleOutline, listOutline, chevronForwardOutline,
} from "ionicons/icons"
import { getMonthlyAttendance } from "@/composables/useAttendance"
import { getEmployees as getEmpFromAdmin } from "@/composables/useAdmin"
import { formatDate, formatTime } from "@/lib/datetime"
import { attendanceLabels } from "@/lib/status"
import type { Profile, Attendance } from "@/types/database"

const employees = ref<Profile[]>([])
const selectedEmployeeId = ref<string | null>(null)
const attendanceHistory = ref<Attendance[]>([])
const showDetailModal = ref(false)

const selectedEmployee = computed(() =>
	employees.value.find((e) => e.id === selectedEmployeeId.value) || null,
)

// Hitung rekap status
const counts = computed(() => {
	const res = { present: 0, late: 0, sick: 0, leave: 0 }
	attendanceHistory.value.forEach((r) => {
		if (r.status === "present") res.present++
		else if (r.status === "late") res.late++
		else if (r.status === "sick") res.sick++
		else if (r.status === "on_leave") res.leave++
	})
	return res
})

function initials(name: string) {
	return name.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase()
}

async function onEmployeeChange() {
	if (!selectedEmployeeId.value) return
	const now = new Date()
	const year = now.getFullYear()
	const month = now.getMonth() + 1
	attendanceHistory.value = await getMonthlyAttendance(selectedEmployeeId.value, year, month)
}

onMounted(async () => {
	employees.value = await getEmpFromAdmin()
})
</script>

<style scoped>
.field { margin-bottom: 12px; }
.filter-select { background: var(--surface); border-radius: 12px; padding: 4px 12px; }
.emp-btn-card { cursor: pointer; border-color: var(--primary-soft); background: var(--surface); transition: all 0.2s ease; }
.emp-btn-card:hover { transform: scale(1.01); border-color: var(--primary); }
.emp-btn-content { display: flex; align-items: center; gap: 12px; padding: 12px; }
.avatar {
	width: 44px; height: 44px; border-radius: 12px; background: var(--primary-soft);
	display: flex; align-items: center; justify-content: center; font-weight: 700; font-family: "Outfit"; color: var(--primary);
}
.tap-hint { margin: 0; padding: 6px 12px; background: var(--surface-3); text-align: center; font-size: 0.72rem; color: var(--text-2); border-top: 1px solid var(--border); }
.avatar-large {
	width: 80px; height: 80px; margin: 0 auto; border-radius: 50%;
	background: var(--primary-grad); display: flex; align-items: center;
	justify-content: center; font-family: "Outfit"; font-size: 1.8rem; font-weight: 700; color: #fff;
}
.detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); }
.detail-row:last-child { border-bottom: none; }
.summary-box {
	background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
	padding: 12px; text-align: center;
}
.summary-box .num { font-size: 1.6rem; font-weight: 700; font-family: "Outfit"; }
.summary-box .lbl { font-size: 0.75rem; color: var(--text-2); margin-top: 2px; }
.text-success { color: #7ee081; }
.text-warning { color: #ffc164; }
.text-danger { color: #ff8078; }
.text-info { color: #7fd4fb; }
</style>
