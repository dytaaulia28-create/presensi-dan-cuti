<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<ion-toolbar>
				<ion-title>Cuti</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content :fullscreen="true">
			<div class="page-pad">
				<ion-segment v-model="tab" mode="md">
					<ion-segment-button value="ajukan"><ion-label>Ajukan</ion-label></ion-segment-button>
					<ion-segment-button value="riwayat"><ion-label>Riwayat</ion-label></ion-segment-button>
				</ion-segment>

				<!-- FORM AJUKAN -->
				<div v-if="tab === 'ajukan'" style="margin-top:16px">
					<label class="form-label">Jenis Cuti</label>
					<ion-select v-model="selectedTypeId" interface="action-sheet" placeholder="Pilih jenis cuti" class="field">
						<ion-select-option v-for="t in eligibleTypes" :key="t.id" :value="t.id">{{t.name}}</ion-select-option>
					</ion-select>

					<div v-if="selectedType" class="info-note">
						<ion-icon :icon="informationCircleOutline" />
						<span>{{selectedType.description}}{{quotaNote}}</span>
					</div>

					<label class="form-label">Tanggal Mulai</label>
					<ion-input v-model="startDate" type="date" fill="outline" class="field" />
					<label class="form-label">Tanggal Selesai</label>
					<ion-input v-model="endDate" type="date" fill="outline" class="field" />

					<div v-if="workingDays > 0" class="muted" style="font-size:.8rem;margin:8px 4px">
						Total {{workingDays}} hari kerja akan diajukan.
					</div>

					<label class="form-label">Alasan</label>
					<ion-textarea v-model="reason" fill="outline" :rows="3" placeholder="Jelaskan alasan cuti" class="field" />

					<template v-if="selectedType?.requires_document">
						<label class="form-label">Dokumen Pendukung (wajib)</label>
						<input type="file" accept="image/*,application/pdf" @change="onFile" class="file-input" />
					</template>

					<ion-button expand="block" class="submit-btn" :disabled="submitting" @click="onSubmit">
						<ion-spinner v-if="submitting" name="crescent" />
						<span v-else>Kirim Pengajuan</span>
					</ion-button>
				</div>

				<!-- RIWAYAT -->
				<div v-else style="margin-top:16px">
					<div v-if="requests.length === 0" class="empty-state">
						<ion-icon :icon="calendarOutline" />
						<p>Belum ada pengajuan cuti.</p>
					</div>
					<div v-for="r in requests" :key="r.id" class="card req">
						<div class="req-head">
							<strong>{{r.leave_types?.name}}</strong>
							<span class="badge" :class="'badge-' + r.status">{{leaveLabels[r.status]}}</span>
						</div>
						<div class="muted" style="font-size:.8rem;margin-top:4px">
							{{formatDate(r.start_date)}} - {{formatDate(r.end_date)}} ({{r.total_days}} hari)
						</div>
						<div v-if="r.reason" style="font-size:.85rem;margin-top:6px">{{r.reason}}</div>
						<div v-if="r.status === 'rejected' && r.rejection_reason" class="reject-note">
							Alasan ditolak: {{r.rejection_reason}}
						</div>
					</div>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import {
	IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
	IonSegment, IonSegmentButton, IonLabel, IonSelect, IonSelectOption,
	IonInput, IonTextarea, IonButton, IonIcon, IonSpinner, toastController,
} from "@ionic/vue"
import { informationCircleOutline, calendarOutline } from "ionicons/icons"
import {
	getLeaveTypes, eligibleLeaveTypes, getBalances,
	getMyLeaveRequests, submitLeave,
} from "@/composables/useLeave"
import { authStore } from "@/stores/auth"
import { formatDate, countWorkingDays } from "@/lib/datetime"
import { leaveLabels } from "@/lib/status"
import type { LeaveType, LeaveBalance, LeaveRequest } from "@/types/database"

const tab = ref<"ajukan" | "riwayat">("ajukan")
const allTypes = ref<LeaveType[]>([])
const balances = ref<LeaveBalance[]>([])
const requests = ref<LeaveRequest[]>([])
const selectedTypeId = ref<string | null>(null)
const startDate = ref("")
const endDate = ref("")
const reason = ref("")
const document = ref<File | null>(null)
const submitting = ref(false)

const eligibleTypes = computed(() => {
	const p = authStore.state.profile
	return p ? eligibleLeaveTypes(allTypes.value, p) : []
})
const selectedType = computed(() =>
	allTypes.value.find((t) => t.id === selectedTypeId.value) || null,
)
const workingDays = computed(() =>
	startDate.value && endDate.value ? countWorkingDays(startDate.value, endDate.value) : 0,
)
const quotaNote = computed(() => {
	if (!selectedType.value) return ""
	if (selectedType.value.quota_days === null) return " (tanpa batas kuota)"
	const bal = balances.value.find((b) => b.leave_type_id === selectedType.value!.id)
	const remaining = bal?.remaining_days ?? selectedType.value.quota_days
	return ` — sisa saldo: ${remaining} hari.`
})

function onFile(e: Event) {
	const input = e.target as HTMLInputElement
	document.value = input.files?.[0] ?? null
}

async function toast(msg: string, color = "primary") {
	const t = await toastController.create({ message: msg, duration: 2800, color, position: "top" })
	await t.present()
}

async function onSubmit() {
	const uid = authStore.state.userId
	if (!uid || !selectedType.value) {
		await toast("Pilih jenis cuti terlebih dahulu.", "warning")
		return
	}
	submitting.value = true
	const res = await submitLeave({
		employeeId: uid,
		leaveType: selectedType.value,
		startDate: startDate.value,
		endDate: endDate.value,
		reason: reason.value,
		document: document.value,
		balances: balances.value,
	})
	submitting.value = false
	await toast(res.message, res.ok ? "success" : "danger")
	if (res.ok) {
		selectedTypeId.value = null
		startDate.value = endDate.value = reason.value = ""
		document.value = null
		await loadRequests()
		tab.value = "riwayat"
	}
}

async function loadRequests() {
	const uid = authStore.state.userId
	if (uid) requests.value = await getMyLeaveRequests(uid)
}

onMounted(async () => {
	const uid = authStore.state.userId
	allTypes.value = await getLeaveTypes()
	if (uid) balances.value = await getBalances(uid)
	await loadRequests()
})
watch(tab, (v) => { if (v === "riwayat") loadRequests() })
</script>

<style scoped>
.field { margin-bottom: 6px; }
.submit-btn { margin-top: 20px; height: 50px; --border-radius: 14px; }
.info-note {
	display: flex; gap: 8px; align-items: flex-start;
	background: var(--primary-soft); border-radius: 12px;
	padding: 10px 12px; font-size: .8rem; margin: 8px 0;
}
.info-note ion-icon { font-size: 1.1rem; color: var(--primary); flex-shrink: 0; }
.file-input { margin: 6px 4px; color: var(--text-2); font-size: .85rem; }
.req { margin-bottom: 10px; }
.req-head { display: flex; justify-content: space-between; align-items: center; }
.reject-note { color: #ff8078; font-size: .8rem; margin-top: 6px; }
</style>
