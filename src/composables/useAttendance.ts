import { supabase, ATTENDANCE_BUCKET } from "@/lib/supabase"
import { logActivity } from "@/lib/audit"
import { todayISO, nowTimeString } from "@/lib/datetime"
import type { Attendance, WorkShift, AttendanceStatus } from "@/types/database"

export interface CheckInResult {
	ok: boolean
	message: string
	status?: AttendanceStatus
}

// Ambil shift default aktif.
export async function getDefaultShift(): Promise<WorkShift | null> {
	const { data } = await supabase
		.from("work_shifts")
		.select("*")
		.order("is_default", { ascending: false })
		.limit(1)
		.maybeSingle()
	return (data as WorkShift) ?? null
}

// Ambil absensi hari ini milik karyawan.
export async function getTodayAttendance(
	employeeId: string,
): Promise<Attendance | null> {
	const { data } = await supabase
		.from("attendances")
		.select("*")
		.eq("employee_id", employeeId)
		.eq("date", todayISO())
		.maybeSingle()
	return (data as Attendance) ?? null
}

// Tentukan status berdasarkan jam server-side (patokan shift).
function resolveStatus(shift: WorkShift, serverTime: string): AttendanceStatus | "closed" {
	if (serverTime > shift.check_in_deadline) return "closed"
	if (serverTime > shift.late_threshold) return "late"
	return "present"
}

// Upload selfie ke Supabase Storage lalu kembalikan public URL.
async function uploadSelfie(
	employeeId: string,
	blob: Blob,
	kind: "in" | "out",
): Promise<string> {
	const path = `${employeeId}/${todayISO()}/${kind}-${Date.now()}.jpg`
	const { error } = await supabase.storage
		.from(ATTENDANCE_BUCKET)
		.upload(path, blob, { contentType: "image/jpeg", upsert: true })
	if (error) throw error
	const { data } = supabase.storage.from(ATTENDANCE_BUCKET).getPublicUrl(path)
	return data.publicUrl
}

// Ambil waktu server (mencegah manipulasi jam device).
async function getServerTime(): Promise<Date> {
	const { data } = await supabase.rpc("now").single()
	if (data) return new Date(data as string)
	return new Date()
}

export async function performCheckIn(
	employeeId: string,
	selfie: Blob,
): Promise<CheckInResult> {
	const shift = await getDefaultShift()
	if (!shift) return { ok: false, message: "Shift kerja belum dikonfigurasi admin." }

	// Validasi waktu (server-side lebih aman; fallback ke device jika RPC tak tersedia)
	let serverTime: string
	try {
		const st = await getServerTime()
		serverTime = st.toTimeString().slice(0, 8)
	} catch {
		serverTime = nowTimeString()
	}

	const status = resolveStatus(shift, serverTime)
	if (status === "closed") {
		return {
			ok: false,
			message: `Waktu absensi telah ditutup (batas ${shift.check_in_deadline}). Silakan hubungi HRD.`,
		}
	}

	const existing = await getTodayAttendance(employeeId)
	if (existing?.check_in_time) {
		return { ok: false, message: "Anda sudah melakukan check-in hari ini." }
	}

	const photoUrl = await uploadSelfie(employeeId, selfie, "in")
	const nowIso = new Date().toISOString()

	const { error } = await supabase.from("attendances").upsert(
		{
			employee_id: employeeId,
			date: todayISO(),
			check_in_time: nowIso,
			check_in_photo_url: photoUrl,
			status,
			shift_id: shift.id,
		},
		{ onConflict: "employee_id,date" },
	)
	if (error) return { ok: false, message: error.message }

	await logActivity(employeeId, "check_in", "attendances", undefined, { status })
	return {
		ok: true,
		status,
		message:
			status === "late"
				? "Check-in berhasil, namun Anda tercatat TERLAMBAT."
				: "Check-in berhasil. Selamat bekerja!",
	}
}

export async function performCheckOut(
	employeeId: string,
	selfie: Blob | null,
): Promise<CheckInResult> {
	const existing = await getTodayAttendance(employeeId)
	if (!existing?.check_in_time) {
		return { ok: false, message: "Anda belum check-in hari ini." }
	}
	if (existing.check_out_time) {
		return { ok: false, message: "Anda sudah check-out hari ini." }
	}

	let photoUrl: string | null = null
	if (selfie) photoUrl = await uploadSelfie(employeeId, selfie, "out")

	const { error } = await supabase
		.from("attendances")
		.update({
			check_out_time: new Date().toISOString(),
			check_out_photo_url: photoUrl,
		})
		.eq("id", existing.id)
	if (error) return { ok: false, message: error.message }

	await logActivity(employeeId, "check_out", "attendances", existing.id)
	return { ok: true, message: "Check-out berhasil. Sampai jumpa besok!" }
}

// Riwayat absensi per bulan.
export async function getMonthlyAttendance(
	employeeId: string,
	year: number,
	month: number,
): Promise<Attendance[]> {
	const start = `${year}-${String(month).padStart(2, "0")}-01`
	const endDate = new Date(year, month, 0).getDate()
	const end = `${year}-${String(month).padStart(2, "0")}-${endDate}`
	const { data } = await supabase
		.from("attendances")
		.select("*")
		.eq("employee_id", employeeId)
		.gte("date", start)
		.lte("date", end)
		.order("date", { ascending: false })
	return (data as Attendance[]) ?? []
}
