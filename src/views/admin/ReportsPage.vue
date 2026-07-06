<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<ion-toolbar>
				<ion-title>Laporan</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content :fullscreen="true">
			<div class="page-pad">
				<h3 class="section-title">Distribusi Status Hari Ini</h3>
				<div class="card">
					<PieChart :labels="dist.labels" :values="dist.values" />
				</div>

				<h3 class="section-title" style="margin-top:20px">Tren Kehadiran (14 Hari)</h3>
				<div class="card">
					<BarChart :labels="trend.labels" :values="trend.values" label="Kehadiran" />
				</div>

				<h3 class="section-title" style="margin-top:20px">Kehadiran per Divisi (Bulan Ini)</h3>
				<div class="card">
					<BarChart :labels="byDivision.labels" :values="byDivision.values" label="Hari hadir" />
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from "@ionic/vue"
import BarChart from "@/components/BarChart.vue"
import PieChart from "@/components/PieChart.vue"
import { getAttendanceTrend, getStatusDistribution } from "@/composables/useAdmin"
import { supabase } from "@/lib/supabase"

const dist = ref<{ labels: string[]; values: number[] }>({ labels: [], values: [] })
const trend = ref<{ labels: string[]; values: number[] }>({ labels: [], values: [] })
const byDivision = ref<{ labels: string[]; values: number[] }>({ labels: [], values: [] })

async function loadByDivision() {
	const now = new Date()
	const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
	const { data } = await supabase
		.from("attendances")
		.select("status, profiles(division)")
		.gte("date", start)
		.in("status", ["present", "late"])
	const rows = (data as unknown as { profiles: { division: string | null } | null }[]) ?? []
	const map: Record<string, number> = {}
	for (const r of rows) {
		const div = r.profiles?.division || "Tanpa Divisi"
		map[div] = (map[div] ?? 0) + 1
	}
	byDivision.value = {
		labels: Object.keys(map),
		values: Object.values(map),
	}
}

onMounted(async () => {
	dist.value = await getStatusDistribution()
	trend.value = await getAttendanceTrend()
	await loadByDivision()
})
</script>
