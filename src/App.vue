<template>
	<div class="desktop-background-shell">
		<div class="phone-simulator-frame">
			<!-- Notch / Dynamic Island Simulator -->
			<div class="phone-notch"></div>

			<!-- Status Bar Simulator -->
			<div class="phone-status-bar">
				<span class="status-time">{{ clock }}</span>
				<div class="status-icons">
					<!-- Signal -->
					<span class="icon-signal">
						<svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
							<rect x="0" y="7" width="3" height="5" rx="0.8" opacity="0.4"/>
							<rect x="4.3" y="5" width="3" height="7" rx="0.8" opacity="0.6"/>
							<rect x="8.6" y="2.5" width="3" height="9.5" rx="0.8" opacity="0.8"/>
							<rect x="12.9" y="0" width="3" height="12" rx="0.8"/>
						</svg>
					</span>
					<!-- WiFi -->
					<span class="icon-wifi">
						<svg width="15" height="12" viewBox="0 0 15 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
							<path d="M1 4.5C3.5 2 11.5 2 14 4.5" opacity="0.4"/>
							<path d="M3 6.8C4.8 5 10.2 5 12 6.8" opacity="0.7"/>
							<path d="M5.2 9C6.2 8 8.8 8 9.8 9"/>
							<circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none"/>
						</svg>
					</span>
					<!-- Battery -->
					<span class="icon-battery">
						<svg width="22" height="12" viewBox="0 0 22 12" fill="none">
							<rect x="0.5" y="0.5" width="18" height="11" rx="2.5" stroke="currentColor" stroke-opacity="0.7"/>
							<rect x="2" y="2" width="13" height="8" rx="1.5" fill="currentColor"/>
							<path d="M19.5 4v4c1.2-.4 1.2-3.6 0-4z" fill="currentColor" fill-opacity="0.6"/>
						</svg>
					</span>
				</div>
			</div>

			<!-- Area Layar Aktif Aplikasi (Main App Content) -->
			<div class="phone-screen-content">
				<ion-app>
					<ion-router-outlet />
				</ion-app>
			</div>

			<!-- Home Indicator Simulator -->
			<div class="phone-home-indicator"></div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { IonApp, IonRouterOutlet } from "@ionic/vue"

const clock = ref("")
let timer: number | undefined

function tick() {
	const now = new Date()
	clock.value = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
}

onMounted(() => {
	tick()
	timer = window.setInterval(tick, 1000)
})

onUnmounted(() => {
	clearInterval(timer)
})
</script>
