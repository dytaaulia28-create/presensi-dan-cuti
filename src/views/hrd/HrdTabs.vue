<template>
	<ion-page>
		<ion-tabs>
			<ion-router-outlet />
			<ion-tab-bar slot="bottom">
				<ion-tab-button tab="beranda" href="/hrd/beranda">
					<ion-icon :icon="gridOutline" />
					<ion-label>Beranda</ion-label>
				</ion-tab-button>
				<ion-tab-button tab="absensi" href="/hrd/absensi">
					<ion-icon :icon="listOutline" />
					<ion-label>Absensi</ion-label>
				</ion-tab-button>
				<ion-tab-button tab="cuti" href="/hrd/cuti">
					<ion-icon :icon="checkmarkDoneOutline" />
					<ion-label>Cuti</ion-label>
				</ion-tab-button>
				<ion-tab-button tab="laporan" href="/hrd/laporan">
					<ion-icon :icon="barChartOutline" />
					<ion-label>Laporan</ion-label>
				</ion-tab-button>
				<ion-tab-button tab="profil" href="/hrd/profil">
					<ion-icon :icon="personOutline" />
					<ion-label>Profil</ion-label>
				</ion-tab-button>
			</ion-tab-bar>
		</ion-tabs>
	</ion-page>
</template>

<script setup lang="ts">
import {
	IonPage, IonTabs, IonRouterOutlet, IonTabBar, IonTabButton, IonIcon, IonLabel,
} from "@ionic/vue"
import {
	gridOutline, listOutline, checkmarkDoneOutline, barChartOutline, personOutline,
} from "ionicons/icons"
</script>
