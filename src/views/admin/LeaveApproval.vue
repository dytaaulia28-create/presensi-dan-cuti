<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<ion-toolbar>
				<ion-title>Approval Cuti</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content :fullscreen="true">
			<div class="page-pad">
				<ion-segment v-model="tab" mode="md">
					<ion-segment-button value="pending"><ion-label>Menunggu</ion-label></ion-segment-button>
					<ion-segment-button value="all"><ion-label>Semua</ion-label></ion-segment-button>
				</ion-segment>

				<div style="margin-top:16px">
					<div v-if="list.length === 0" class="empty-state">
						<ion-icon :icon="checkmarkDoneOutline" />
						<p>Tidak ada pengajuan.</p>
					</div>

					<div v-for="r in list" :key="r.id" class="card req">
						<div class="req-head">
							<div>
								<strong>{{r.profiles?.full_name || '-'}}</strong>
								<div class="muted" style="font-size:.75rem">{{r.profiles?.division || '-'}}</div>
							</div>
							<span class="badge" :class="'badge-' + r.status">{{leaveLabels[r.status]}}</span>
						</div>

						<div class="req-body">
							<div><span class="muted">Jenis:</span> {{r.leave_types?.name}}</div>
							<div><span class="muted">Tanggal:</span> {{formatDate(r.start_date)}} - {{formatDate(r.end_date)}} ({{r.total_days}} hari)</div>
							<div v-if="r.reason"><span class="muted">Alasan:</span> {{r.reason}}</div>
							<a v-if="r.document_url" :href="r.document_url" target="_blank" class="doc-link">
								<ion-icon :icon="documentAttachOutline" /> Lihat dokumen
							</a>
						</div>

						<div v-if="r.status === 'pending'" class="actions">
							<ion-button size="small" color="success" @click="approve(r.id)">Setujui</ion-button>
							<ion-button size="small" color="danger" fill="outline" @click="reject(r.id)">Tolak</ion-button>
						</div>
						<div v-else-if="r.status === 'rejected' && r.rejection_reason" class="reject-note">
							Alasan ditolak: {{r.rejection_reason}}
						</div>
					</div>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue"
import {
	IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
	IonSegment, IonSegmentButton, IonLabel, IonButton, IonIcon,
	toastController, alertController,
} from "@ionic/vue"
import { checkmarkDoneOutline, documentAttachOutline } from "ionicons/icons"
import { getPendingLeaves, getAllLeaves, reviewLeave } from "@/composables/useLeave"
import { authStore } from "@/stores/auth"
import { formatDate } from "@/lib/datetime"
import { leaveLabels } from "@/lib/status"
import type { LeaveRequest } from "@/types/database"

const tab = ref<"pending" | "all">("pending")
const list = ref<LeaveRequest[]>([])

async function load() {
	list.value = tab.value === "pending" ? await getPendingLeaves() : await getAllLeaves()
}

async function toast(msg: string, color = "primary") {
	const t = await toastController.create({ message: msg, duration: 2600, color, position: "top" })
	await t.present()
}

async function approve(id: string) {
	const uid = authStore.state.userId
	if (!uid) return
	const res = await reviewLeave(uid, id, "approved")
	await toast(res.message, res.ok ? "success" : "danger")
	await load()
}

async function reject(id: string) {
	const uid = authStore.state.userId
	if (!uid) return
	const alert = await alertController.create({
		header: "Tolak Pengajuan",
		inputs: [{ name: "reason", type: "textarea", placeholder: "Alasan penolakan" }],
		buttons: [
			{ text: "Batal", role: "cancel" },
			{
				text: "Tolak",
				role: "destructive",
				handler: async (data) => {
					const res = await reviewLeave(uid, id, "rejected", data.reason)
					await toast(res.message, res.ok ? "success" : "danger")
					await load()
				},
			},
		],
	})
	await alert.present()
}

onMounted(load)
watch(tab, load)
</script>

<style scoped>
.req { margin-bottom: 10px; }
.req-head { display: flex; justify-content: space-between; align-items: flex-start; }
.req-body { font-size: .85rem; margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
.doc-link { color: var(--primary); font-size: .85rem; display: inline-flex; align-items: center; gap: 4px; margin-top: 4px; }
.actions { display: flex; gap: 8px; margin-top: 12px; }
.reject-note { color: #ff8078; font-size: .8rem; margin-top: 8px; }
</style>
