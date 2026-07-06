// Helper waktu & tanggal (locale Indonesia).

export function todayISO(): string {
	const d = new Date()
	const tz = d.getTimezoneOffset() * 60000
	return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

export function formatDate(iso: string | null): string {
	if (!iso) return "-"
	return new Date(iso).toLocaleDateString("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
	})
}

export function formatTime(iso: string | null): string {
	if (!iso) return "--:--"
	return new Date(iso).toLocaleTimeString("id-ID", {
		hour: "2-digit",
		minute: "2-digit",
	})
}

// Hitung jumlah hari kerja (Senin-Jumat) inklusif antara dua tanggal.
export function countWorkingDays(start: string, end: string): number {
	const s = new Date(start)
	const e = new Date(end)
	if (e < s) return 0
	let count = 0
	const cur = new Date(s)
	while (cur <= e) {
		const day = cur.getDay() // 0 = Minggu, 6 = Sabtu
		if (day !== 0 && day !== 6) count++
		cur.setDate(cur.getDate() + 1)
	}
	return count
}

// Selisih bulan penuh dari tanggal bergabung sampai hari ini.
export function monthsSince(joinedAt: string): number {
	const j = new Date(joinedAt)
	const n = new Date()
	let months = (n.getFullYear() - j.getFullYear()) * 12
	months += n.getMonth() - j.getMonth()
	if (n.getDate() < j.getDate()) months--
	return Math.max(0, months)
}

// Bandingkan jam sekarang (HH:MM:SS) dengan patokan time PostgreSQL (HH:MM:SS).
export function nowTimeString(): string {
	return new Date().toTimeString().slice(0, 8)
}
