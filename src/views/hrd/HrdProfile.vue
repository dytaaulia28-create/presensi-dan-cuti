<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<ion-toolbar>
				<ion-title>Profil HRD</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content :fullscreen="true">
			<div class="page-pad" v-if="p">
				<div class="prof card text-center">
					<div class="avatar">{{initials}}</div>
					<h2 style="margin:12px 0 2px">{{p.full_name}}</h2>
					<p class="muted" style="margin:0">HRD</p>
				</div>

				<div class="card" style="margin-top:12px">
					<div class="row"><span class="muted">NIK</span><strong>{{p.nik}}</strong></div>
					<div class="row"><span class="muted">Divisi</span><strong>{{p.division || 'HRD'}}</strong></div>
					<div class="row"><span class="muted">Gender</span><strong>{{p.gender === 'female' ? 'Perempuan' : 'Laki-laki'}}</strong></div>
					<div class="row"><span class="muted">Bergabung</span><strong>{{formatDate(p.joined_at)}}</strong></div>
					<div class="row"><span class="muted">Masa Kerja</span><strong>{{months}} bulan</strong></div>
				</div>

				<ion-button expand="block" color="danger" fill="outline" style="margin-top:20px" @click="logout">
					<ion-icon slot="start" :icon="logOutOutline" /> Keluar
				</ion-button>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useRouter } from "vue-router"
import {
	IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
} from "@ionic/vue"
import { logOutOutline } from "ionicons/icons"
import { authStore } from "@/stores/auth"
import { formatDate, monthsSince } from "@/lib/datetime"

const router = useRouter()
const p = computed(() => authStore.state.profile)
const months = computed(() => (p.value ? monthsSince(p.value.joined_at) : 0))
const initials = computed(() =>
	(p.value?.full_name || "?")
		.split(" ")
		.slice(0, 2)
		.map((s) => s[0])
		.join("")
		.toUpperCase(),
)

async function logout() {
	await authStore.signOut()
	router.replace("/login")
}
</script>

<style scoped>
.avatar {
	width: 84px; height: 84px; margin: 0 auto; border-radius: 50%;
	background: var(--primary-grad); display: flex; align-items: center;
	justify-content: center; font-family: "Outfit"; font-size: 1.8rem; font-weight: 700; color: #fff;
}
.row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); }
.row:last-child { border-bottom: none; }
</style>
