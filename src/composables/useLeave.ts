import { supabase, ATTENDANCE_BUCKET } from "@/lib/supabase"
import { logActivity } from "@/lib/audit"
import { countWorkingDays, monthsSince } from "@/lib/datetime"
import type {
	LeaveType,
	LeaveBalance,
	LeaveRequest,
	Profile,
} from "@/types/database"

export async function getLeaveTypes(): Promise<LeaveType[]> {
	const { data } = await supabase.from("leave_types").select("*").order("name")
	return (data as LeaveType[]) ?? []
}

// Jenis cuti yang boleh diajukan karyawan (filter gender & masa kerja).
export function eligibleLeaveTypes(
	types: LeaveType[],
	profile: Profile,
): LeaveType[] {
	const months = monthsSince(profile.joined_at)
	return types.filter((t) => {
		if (t.gender_restriction && t.gender_restriction !== profile.gender)
			return false
		if (months < t.min_work_months) return false
		return true
	})
}

export async function getBalances(employeeId: string): Promise<LeaveBalance[]> {
	const { data } = await supabase
		.from("leave_balances")
		.select("*, leave_types(*)")
		.eq("employee_id", employeeId)
		.eq("year", new Date().getFullYear())
	return (data as LeaveBalance[]) ?? []
}

export async function getMyLeaveRequests(
	employeeId: string,
): Promise<LeaveRequest[]> {
	const { data } = await supabase
		.from("leave_requests")
		.select("*, leave_types(*)")
		.eq("employee_id", employeeId)
		.order("created_at", { ascending: false })
	return (data as LeaveRequest[]) ?? []
}

async function uploadDocument(employeeId: string, file: File): Promise<string> {
	const path = `${employeeId}/documents/${Date.now()}-${file.name}`
	const { error } = await supabase.storage
		.from(ATTENDANCE_BUCKET)
		.upload(path, file, { upsert: true })
	if (error) throw error
	const { data } = supabase.storage.from(ATTENDANCE_BUCKET).getPublicUrl(path)
	return data.publicUrl
}

export interface SubmitLeaveInput {
	employeeId: string
	leaveType: LeaveType
	startDate: string
	endDate: string
	reason: string
	document: File | null
	balances: LeaveBalance[]
}

export async function submitLeave(
	input: SubmitLeaveInput,
): Promise<{ ok: boolean; message: string }> {
	const { employeeId, leaveType, startDate, endDate, reason, document, balances } =
		input

	if (!startDate || !endDate)
		return { ok: false, message: "Tanggal cuti wajib diisi." }
	if (endDate < startDate)
		return { ok: false, message: "Tanggal selesai tidak boleh sebelum tanggal mulai." }

	const totalDays = countWorkingDays(startDate, endDate)
	if (totalDays <= 0)
		return { ok: false, message: "Rentang cuti tidak mengandung hari kerja." }

	if (leaveType.requires_document && !document)
		return {
			ok: false,
			message: `${leaveType.name} wajib melampirkan dokumen pendukung.`,
		}

	// Validasi saldo untuk cuti berkuota.
	if (leaveType.quota_days !== null) {
		const bal = balances.find((b) => b.leave_type_id === leaveType.id)
		const remaining = bal?.remaining_days ?? leaveType.quota_days
		if (totalDays > remaining)
			return {
				ok: false,
				message: `Sisa ${leaveType.name} tidak mencukupi (sisa ${remaining} hari, diajukan ${totalDays} hari).`,
			}
	}

	let documentUrl: string | null = null
	if (document) {
		try {
			documentUrl = await uploadDocument(employeeId, document)
		} catch (e) {
			return { ok: false, message: "Gagal mengunggah dokumen." }
		}
	}

	const { data, error } = await supabase
		.from("leave_requests")
		.insert({
			employee_id: employeeId,
			leave_type_id: leaveType.id,
			start_date: startDate,
			end_date: endDate,
			total_days: totalDays,
			reason,
			document_url: documentUrl,
			status: "pending",
		})
		.select()
		.single()
	if (error) return { ok: false, message: error.message }

	await logActivity(employeeId, "leave_request", "leave_requests", data.id, {
		type: leaveType.code,
		days: totalDays,
	})
	return { ok: true, message: "Pengajuan cuti berhasil dikirim & menunggu approval." }
}

// ---- Admin ----
export async function getPendingLeaves(): Promise<LeaveRequest[]> {
	const { data } = await supabase
		.from("leave_requests")
		.select("*, leave_types(*), profiles(full_name, nik, division)")
		.eq("status", "pending")
		.order("created_at", { ascending: true })
	return (data as LeaveRequest[]) ?? []
}

export async function getAllLeaves(): Promise<LeaveRequest[]> {
	const { data } = await supabase
		.from("leave_requests")
		.select("*, leave_types(*), profiles(full_name, nik, division)")
		.order("created_at", { ascending: false })
		.limit(200)
	return (data as LeaveRequest[]) ?? []
}

export async function reviewLeave(
	adminId: string,
	requestId: string,
	decision: "approved" | "rejected",
	rejectionReason?: string,
): Promise<{ ok: boolean; message: string }> {
	const { error } = await supabase
		.from("leave_requests")
		.update({
			status: decision,
			reviewed_by: adminId,
			reviewed_at: new Date().toISOString(),
			rejection_reason: decision === "rejected" ? rejectionReason ?? null : null,
		})
		.eq("id", requestId)
	if (error) return { ok: false, message: error.message }

	await logActivity(
		adminId,
		decision === "approved" ? "leave_approved" : "leave_rejected",
		"leave_requests",
		requestId,
	)
	return {
		ok: true,
		message:
			decision === "approved"
				? "Pengajuan cuti disetujui. Saldo & absensi diperbarui otomatis."
			: "Pengajuan cuti ditolak.",
	}
}
