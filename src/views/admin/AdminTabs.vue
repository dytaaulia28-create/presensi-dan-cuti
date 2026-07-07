<template>
	<ion-page>
		<ion-tabs>
			<ion-router-outlet />
			<ion-tab-bar slot="bottom">
				<ion-tab-button tab="akun" href="/admin/akun">
					<ion-icon :icon="peopleOutline" />
					<ion-label>Akun</ion-label>
				</ion-tab-button>
				<ion-tab-button tab="log" href="/admin/log">
					<ion-icon :icon="listOutline" />
					<ion-label>Log Aktivitas</ion-label>
				</ion-tab-button>
				<ion-tab-button tab="profil" href="/admin/profil">
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
	peopleOutline, listOutline, personOutline,
} from "ionicons/icons"
</script>
