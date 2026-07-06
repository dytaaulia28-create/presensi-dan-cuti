<template>
	<ion-page>
		<ion-tabs>
			<ion-router-outlet />
			<ion-tab-bar slot="bottom">
				<ion-tab-button tab="beranda" href="/app/beranda">
					<ion-icon :icon="homeOutline" />
					<ion-label>Beranda</ion-label>
				</ion-tab-button>
				<ion-tab-button tab="absensi" href="/app/absensi">
					<ion-icon :icon="cameraOutline" />
					<ion-label>Absensi</ion-label>
				</ion-tab-button>
				<ion-tab-button tab="cuti" href="/app/cuti">
					<ion-icon :icon="calendarOutline" />
					<ion-label>Cuti</ion-label>
				</ion-tab-button>
				<ion-tab-button tab="profil" href="/app/profil">
					<ion-icon :icon="personOutline" />
					<ion-label>Profil</ion-label>
				</ion-tab-button>
			</ion-tab-bar>
		</ion-tabs>
	</ion-page>
</template>

<script setup lang="ts">
import {
	IonPage,
	IonTabs,
	IonRouterOutlet,
	IonTabBar,
	IonTabButton,
	IonIcon,
	IonLabel,
} from "@ionic/vue"
import {
	homeOutline,
	cameraOutline,
	calendarOutline,
	personOutline,
} from "ionicons/icons"
</script>
