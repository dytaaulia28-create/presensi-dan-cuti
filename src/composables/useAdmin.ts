import { supabase } from "@/lib/supabase"
import { todayISO } from "@/lib/datetime"
import type { Attendance, Profile } from "@/types/database"

export interface DashboardStats {
	present: number
	late: number
	absent: number
	on_leave: number
	totalEmployees: number
	pendingLeaves: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
	const today = todayISO()
	const [att, emp, pending] = await Promise.all([
		supabase.from("attendances").select("status").eq("date", today),
		supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
		supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
	])
	const rows = (att.data as { status: string }[]) ?? []
	return {
		present: rows.filter((r) => r.status === "present").length,
		late: rows.filter((r) => r.status === "late").length,
		absent: rows.filter((r) => r.status === "absent").length,
		on_leave: rows.filter((r) => r.status === "on_leave" || r.status === "sick").length,
		totalEmployees: emp.count ?? 0,
		pendingLeaves: pending.count ?? 0,
	}
}

// Tren kehadiran (hadir + terlambat) 14 hari terakhir.
export async function getAttendanceTrend(): Promise<{ labels: string[]; values: number[] }> {
	const end = new Date()
	const start = new Date()
	start.setDate(end.getDate() - 13)
	const startIso = start.toISOString().slice(0, 10)
	const { data } = await supabase
		.from("attendances")
		.select("date, status")
		.gte("date", startIso)
		.in("status", ["present", "late"])
	const rows = (data as { date: string; status: string }[]) ?? []
	const labels: string[] = []
	const values: number[] = []
	for (let i = 0; i < 14; i++) {
		const d = new Date(start)
		d.setDate(start.getDate() + i)
		const iso = d.toISOString().slice(0, 10)
		labels.push(d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }))
		values.push(rows.filter((r) => r.date === iso).length)
	}
	return { labels, values }
}

// Distribusi status absensi hari ini (untuk pie chart).
export async function getStatusDistribution(): Promise<{ labels: string[]; values: number[] }> {
	const { data } = await supabase.from("attendances").select("status").eq("date", todayISO())
	const rows = (data as { status: string }[]) ?? []
	const keys = ["present", "late", "absent", "on_leave", "sick"]
	const labelMap: Record<string, string> = {
		present: "Hadir", late: "Terlambat", absent: "Alpha", on_leave: "Cuti", sick: "Sakit",
	}
	return {
		labels: keys.map((k) => labelMap[k]),
		values: keys.map((k) => rows.filter((r) => r.status === k).length),
	}
}

export async function getEmployees(): Promise<Profile[]> {
	const { data } = await supabase.from("profiles").select("*").order("full_name")
	return (data as Profile[]) ?? []
}

export async function toggleEmployeeActive(id: string, active: boolean): Promise<void> {
	await supabase.from("profiles").update({ is_active: active }).eq("id", id)
}

export async function updateEmployee(id: string, patch: Partial<Profile>): Promise<void> {
	await supabase.from("profiles").update(patch).eq("id", id)
}

export async function createEmployee(input: {
	email: string
	password: string
	full_name: string
	nik: string
	gender: "male" | "female"
	role: "employee" | "hrd" | "admin"
	division: string
}): Promise<{ ok: boolean; message: string }> {
	const { data, error } = await supabase.rpc("create_user_by_admin", {
		p_email: input.email,
		p_password: input.password,
		p_full_name: input.full_name,
		p_nik: input.nik,
		p_gender: input.gender,
		p_role: input.role,
		p_division: input.division,
	})
	if (error) return { ok: false, message: error.message }
	return { ok: true, message: "Akun berhasil dibuat." }
}

export async function deleteEmployee(id: string): Promise<{ ok: boolean; message: string }> {
	const { data, error } = await supabase.rpc("delete_user_by_admin", {
		p_user_id: id,
	})
	if (error) return { ok: false, message: error.message }
	return { ok: true, message: "Akun berhasil dihapus." }
}

export async function getAttendanceByDate(date: string): Promise<Attendance[]> {
	const { data } = await supabase
		.from("attendances")
		.select("*, profiles(full_name, nik, division)")
		.eq("date", date)
		.order("check_in_time", { ascending: true })
	return (data as Attendance[]) ?? []
}
