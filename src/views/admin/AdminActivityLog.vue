<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<ion-toolbar>
				<ion-title>Log Aktivitas</ion-title>
				<ion-buttons slot="end">
					<ion-button @click="load">
						<ion-icon slot="icon-only" :icon="refreshOutline" />
					</ion-button>
				</ion-buttons>
			</ion-toolbar>
		</ion-header>
		<ion-content :fullscreen="true">
			<div class="page-pad">
				<div v-if="loading" class="text-center" style="margin-top:40px">
					<ion-spinner name="crescent" />
					<p class="muted" style="margin-top:10px">Memuat log...</p>
				</div>

				<div v-else>
					<div v-if="logs.length === 0" class="empty-state">
						<ion-icon :icon="listOutline" />
						<p>Belum ada log aktivitas tercatat.</p>
					</div>

					<div v-for="log in logs" :key="log.id" class="card log-card">
						<div class="log-header">
							<strong style="color: var(--primary)">
								{{ log.profiles?.full_name || 'System' }}
							</strong>
							<span class="log-time">{{ formatDateTime(log.created_at) }}</span>
						</div>
						<div class="log-body">
							<div class="action-badge" :class="log.action">
								{{ formatAction(log.action) }}
							</div>
							<p style="margin: 6px 0 0; font-size:.82rem">
								Target: <span class="muted">{{ log.target_table || '-' }}</span> (ID: <span class="muted">{{ log.target_id ? log.target_id.slice(0,8) : '-' }}</span>)
							</p>
							<div v-if="log.metadata" class="meta-json">
								<pre>{{ JSON.stringify(log.metadata, null, 2) }}</pre>
							</div>
						</div>
					</div>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import {
	IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
	IonButtons, IonButton, IonIcon, IonSpinner,
} from "@ionic/vue"
import { refreshOutline, listOutline } from "ionicons/icons"
import { supabase } from "@/lib/supabase"

interface LogEntry {
	id: string
	actor_id: string | null
	action: string
	target_table: string | null
	target_id: string | null
	metadata: any
	created_at: string
	profiles: { full_name: string; nik: string } | null
}

const logs = ref<LogEntry[]>([])
const loading = ref(false)

async function load() {
	loading.value = true
	const { data, error } = await supabase
		.from("audit_logs")
		.select("*, profiles(full_name, nik)")
		.order("created_at", { ascending: false })
		.limit(100)
	loading.value = false
	if (error) {
		console.error("Error loading logs:", error.message)
	} else {
		logs.value = (data as unknown as LogEntry[]) ?? []
	}
}

function formatDateTime(iso: string) {
	return new Date(iso).toLocaleString("id-ID", {
		day: "2-digit",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	})
}

function formatAction(action: string) {
	const map: Record<string, string> = {
		check_in: "Check In Absen",
		check_out: "Check Out Absen",
		leave_request: "Mengajukan Cuti",
		leave_approved: "Menyetujui Cuti",
		leave_rejected: "Menolak Cuti",
		create_account: "Membuat Akun",
		update_account: "Mengedit Akun",
		delete_account: "Menghapus Akun",
		activate_account: "Mengaktifkan Akun",
		deactivate_account: "Menonaktifkan Akun",
	}
	return map[action] || action
}

onMounted(load)
</script>

<style scoped>
.log-card { margin-bottom: 10px; padding: 12px; border-left: 3px solid var(--border); }
.log-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
.log-time { font-size: 0.72rem; color: var(--text-3); }
.log-body { margin-top: 8px; }
.action-badge {
	display: inline-block; font-size: 0.7rem; font-weight: 600; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;
}
.action-badge.check_in { background: rgba(76, 175, 80, 0.15); color: #81c784; }
.action-badge.check_out { background: rgba(33, 150, 243, 0.15); color: #64b5f6; }
.action-badge.leave_request { background: rgba(255, 152, 0, 0.15); color: #ffb74d; }
.action-badge.leave_approved { background: rgba(76, 175, 80, 0.25); color: #81c784; }
.action-badge.leave_rejected { background: rgba(244, 67, 54, 0.25); color: #e57373; }
.action-badge.create_account { background: rgba(156, 39, 176, 0.15); color: #ba68c8; }
.action-badge.update_account { background: rgba(0, 150, 136, 0.15); color: #4db6ac; }
.action-badge.delete_account { background: rgba(244, 67, 54, 0.15); color: #e57373; }
.meta-json {
	margin-top: 8px; background: var(--surface-3); border-radius: 6px; padding: 8px; overflow-x: auto;
}
.meta-json pre { margin: 0; font-family: monospace; font-size: 0.7rem; color: var(--text-2); }
</style>
