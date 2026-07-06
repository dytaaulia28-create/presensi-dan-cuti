<template>
	<canvas ref="canvasEl"></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from "vue"
import { Chart, PieController, ArcElement, Tooltip, Legend } from "chart.js"

Chart.register(PieController, ArcElement, Tooltip, Legend)

const props = defineProps<{
	labels: string[]
	values: number[]
}>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

const palette = ["#4caf50", "#ff9800", "#f44336", "#29b6f6", "#9d7bff"]

function render() {
	if (!canvasEl.value) return
	chart?.destroy()
	chart = new Chart(canvasEl.value, {
		type: "pie",
		data: {
			labels: props.labels,
			datasets: [{ data: props.values, backgroundColor: palette, borderWidth: 0 }],
		},
		options: {
			responsive: true,
			plugins: { legend: { position: "bottom", labels: { color: "#a0a0b0" } } },
		},
	})
}

onMounted(render)
watch(() => [props.labels, props.values], render, { deep: true })
onUnmounted(() => chart?.destroy())
</script>
