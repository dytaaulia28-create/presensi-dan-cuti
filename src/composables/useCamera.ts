import { ref } from "vue"

// Composable kamera selfie berbasis getUserMedia.
// Sengaja HANYA memakai kamera live (facingMode: 'user'),
// TIDAK menerima upload dari galeri agar tidak bisa pakai foto lama.
export function useCamera() {
	const stream = ref<MediaStream | null>(null)
	const error = ref<string | null>(null)
	const active = ref(false)

	async function start(video: HTMLVideoElement): Promise<void> {
		error.value = null
		try {
			stream.value = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "user", width: 720, height: 960 },
				audio: false,
			})
			video.srcObject = stream.value
			await video.play()
			active.value = true
		} catch (e) {
			error.value =
				"Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan dan situs berjalan pada HTTPS."
			console.error(e)
		}
	}

	// Ambil frame saat ini menjadi Blob JPEG.
	function capture(
		video: HTMLVideoElement,
		canvas: HTMLCanvasElement,
	): Promise<Blob | null> {
		const w = video.videoWidth
		const h = video.videoHeight
		canvas.width = w
		canvas.height = h
		const ctx = canvas.getContext("2d")
		if (!ctx) return Promise.resolve(null)
		// mirror agar sesuai preview
		ctx.translate(w, 0)
		ctx.scale(-1, 1)
		ctx.drawImage(video, 0, 0, w, h)
		return new Promise((resolve) =>
			canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85),
		)
	}

	function stop(): void {
		stream.value?.getTracks().forEach((t) => t.stop())
		stream.value = null
		active.value = false
	}

	return { stream, error, active, start, capture, stop }
}
