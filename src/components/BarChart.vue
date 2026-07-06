<template>
	<canvas ref="canvasEl"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from "vue"
import {
	Chart,
	BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
} from "chart.js"

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps<{
	labels: string[]
	values: number[]
	label?: string
}>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

function render() {
	if (!canvasEl.value) return
	chart?.destroy()
	chart = new Chart(canvasEl.value, {
		type: "bar",
		data: {
			labels: props.labels,
			datasets: [
				{
					label: props.label ?? "Data",
					data: props.values,
					backgroundColor: "#6c63ff",
					borderRadius: 6,
				},
			],
		},
		options: {
			responsive: true,
			plugins: { legend: { display: false } },
			scales: {
				x: { ticks: { color: "#a0a0b0" }, grid: { display: false } },
				y: { ticks: { color: "#a0a0b0" }, grid: { color: "rgba(255,255,255,.06)" } },
			},
		},
	})
}

onMounted(render)
watch(() => [props.labels, props.values], render, { deep: true })
onUnmounted(() => chart?.destroy())
</script>
