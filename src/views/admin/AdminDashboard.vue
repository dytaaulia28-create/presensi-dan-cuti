<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<ion-toolbar>
				<ion-title>Dashboard HRD</ion-title>
				<ion-buttons slot="end">
					<ion-button fill="clear" color="danger" @click="handleLogout" id="btn-logout-admin">
						<ion-icon :icon="logOutOutline" slot="icon-only" />
					</ion-button>
				</ion-buttons>
			</ion-toolbar>
		</ion-header>
		<ion-content :fullscreen="true">
			<div class="page-pad">
				<div class="grid-2">
					<div class="stat-card"><div class="value" style="color:#7ee081">{{stats.present}}</div><div class="label muted">Hadir</div></div>
					<div class="stat-card"><div class="value" style="color:#ffc164">{{stats.late}}</div><div class="label muted">Terlambat</div></div>
					<div class="stat-card"><div class="value" style="color:#ff8078">{{stats.absent}}</div><div class="label muted">Alpha</div></div>
					<div class="stat-card"><div class="value" style="color:#7fd4fb">{{stats.on_leave}}</div><div class="label muted">Cuti / Sakit</div></div>
				</div>

				<div class="card" style="margin-top:12px;display:flex;justify-content:space-between;align-items:center">
					<div>
						<div class="muted label">Total Karyawan Aktif</div>
						<div class="value" style="font-family:'Outfit';font-size:1.5rem;font-weight:700">{{stats.totalEmployees}}</div>
					</div>
					<ion-button fill="clear" router-link="/admin/cuti">
						Cuti pending: {{stats.pendingLeaves}}
					</ion-button>
				</div>

				<h3 class="section-title" style="margin-top:20px">Tren Kehadiran (14 Hari)</h3>
				<div class="card">
					<BarChart :labels="trend.labels" :values="trend.values" label="Kehadiran" />
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import {
	IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonIcon,
} from "@ionic/vue"
import { logOutOutline } from "ionicons/icons"
import BarChart from "@/components/BarChart.vue"
import { getDashboardStats, getAttendanceTrend } from "@/composables/useAdmin"
import type { DashboardStats } from "@/composables/useAdmin"
import { supabase } from "@/lib/supabase"

const router = useRouter()

const stats = ref<DashboardStats>({
	present: 0, late: 0, absent: 0, on_leave: 0, totalEmployees: 0, pendingLeaves: 0,
})
const trend = ref<{ labels: string[]; values: number[] }>({ labels: [], values: [] })

onMounted(async () => {
	stats.value = await getDashboardStats()
	trend.value = await getAttendanceTrend()
})

async function handleLogout() {
	await supabase.auth.signOut()
	router.replace("/login")
}
</script>
