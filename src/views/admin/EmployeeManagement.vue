<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<ion-toolbar>
				<ion-title>Manajemen Karyawan</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content :fullscreen="true">
			<div class="page-pad">
				<ion-searchbar
					v-model="query"
					placeholder="Cari nama / NIK"
					class="search"
				></ion-searchbar>

				<div v-if="filtered.length === 0" class="empty-state">
					<ion-icon :icon="peopleOutline" />
					<p>Tidak ada karyawan ditemukan.</p>
				</div>

				<div v-for="e in filtered" :key="e.id" class="card emp">
					<div class="emp-main">
						<div class="emp-avatar">{{initials(e.full_name)}}</div>
						<div>
							<strong>{{e.full_name}}</strong>
							<div class="muted" style="font-size:.75rem">
								{{e.nik}} · {{e.division || 'Tanpa Divisi'}}
							</div>
							<span class="role-tag" :class="e.role">{{e.role === 'admin' ? 'Admin' : 'Karyawan'}}</span>
						</div>
					</div>
					<ion-toggle
						:checked="e.is_active"
						@ionChange="onToggle(e, $event)"
					></ion-toggle>
				</div>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import {
	IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
	IonSearchbar, IonToggle, IonIcon, toastController,
} from "@ionic/vue"
import { peopleOutline } from "ionicons/icons"
import { getEmployees, toggleEmployeeActive } from "@/composables/useAdmin"
import type { Profile } from "@/types/database"

const employees = ref<Profile[]>([])
const query = ref("")

const filtered = computed(() => {
	const q = query.value.toLowerCase().trim()
	if (!q) return employees.value
	return employees.value.filter(
		(e) =>
			e.full_name.toLowerCase().includes(q) ||
			e.nik.toLowerCase().includes(q),
	)
})

function initials(name: string) {
	return name.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase()
}

async function onToggle(emp: Profile, ev: CustomEvent) {
	const checked = (ev.detail as { checked: boolean }).checked
	await toggleEmployeeActive(emp.id, checked)
	emp.is_active = checked
	const t = await toastController.create({
		message: checked ? "Karyawan diaktifkan." : "Karyawan dinonaktifkan.",
		duration: 1800, color: "medium", position: "top",
	})
	await t.present()
}

onMounted(async () => {
	employees.value = await getEmployees()
})
</script>

<style scoped>
.search { --background: var(--surface); --border-radius: 12px; padding: 0; margin-bottom: 12px; }
.emp { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.emp-main { display: flex; gap: 12px; align-items: center; }
.emp-avatar {
	width: 44px; height: 44px; border-radius: 12px; background: var(--surface-3);
	display: flex; align-items: center; justify-content: center; font-weight: 700; font-family: "Outfit";
}
.role-tag { font-size: .68rem; padding: 2px 8px; border-radius: 999px; }
.role-tag.admin { background: var(--primary-soft); color: #b6a1ff; }
.role-tag.employee { background: var(--surface-3); color: var(--text-2); }
</style>
