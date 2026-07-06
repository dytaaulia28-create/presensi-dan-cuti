<template>
	<ion-page>
		<ion-tabs>
			<ion-router-outlet />
			<ion-tab-bar slot="bottom">
				<ion-tab-button tab="beranda" href="/admin/beranda">
					<ion-icon :icon="gridOutline" />
					<ion-label>Beranda</ion-label>
				</ion-tab-button>
				<ion-tab-button tab="karyawan" href="/admin/karyawan">
					<ion-icon :icon="peopleOutline" />
					<ion-label>Karyawan</ion-label>
				</ion-tab-button>
				<ion-tab-button tab="absensi" href="/admin/absensi">
					<ion-icon :icon="listOutline" />
					<ion-label>Absensi</ion-label>
				</ion-tab-button>
				<ion-tab-button tab="cuti" href="/admin/cuti">
					<ion-icon :icon="checkmarkDoneOutline" />
					<ion-label>Cuti</ion-label>
				</ion-tab-button>
				<ion-tab-button tab="laporan" href="/admin/laporan">
					<ion-icon :icon="barChartOutline" />
					<ion-label>Laporan</ion-label>
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
	gridOutline, peopleOutline, listOutline, checkmarkDoneOutline, barChartOutline,
} from "ionicons/icons"
</script>
