// Tipe data yang merepresentasikan skema database Supabase.

export type UserRole = "employee" | "hrd" | "admin"
export type Gender = "male" | "female"
export type AttendanceStatus =
	| "present"
	| "late"
	| "absent"
	| "on_leave"
	| "sick"
export type LeaveStatus = "pending" | "approved" | "rejected"

export interface Profile {
	id: string
	full_name: string
	nik: string
	division: string | null
	position: string | null
	gender: Gender
	joined_at: string
	role: UserRole
	is_active: boolean
	avatar_url: string | null
	created_at: string
}

export interface WorkShift {
	id: string
	name: string
	check_in_start: string
	late_threshold: string
	check_in_deadline: string
	check_out_time: string
	is_default: boolean
	created_at: string
}

export interface Attendance {
	id: string
	employee_id: string
	date: string
	check_in_time: string | null
	check_in_photo_url: string | null
	check_out_time: string | null
	check_out_photo_url: string | null
	status: AttendanceStatus
	shift_id: string | null
	notes: string | null
	created_at: string
	// join opsional
	profiles?: Pick<Profile, "full_name" | "nik" | "division">
}

export interface LeaveType {
	id: string
	name: string
	code: string
	quota_days: number | null
	requires_document: boolean
	gender_restriction: Gender | null
	min_work_months: number
	max_usage_per_employment: number | null
	description: string | null
	created_at: string
}

export interface LeaveBalance {
	id: string
	employee_id: string
	leave_type_id: string
	year: number
	total_days: number
	used_days: number
	remaining_days: number
	created_at: string
	leave_types?: LeaveType
}

export interface LeaveRequest {
	id: string
	employee_id: string
	leave_type_id: string
	start_date: string
	end_date: string
	total_days: number
	reason: string | null
	document_url: string | null
	status: LeaveStatus
	reviewed_by: string | null
	reviewed_at: string | null
	rejection_reason: string | null
	created_at: string
	leave_types?: LeaveType
	profiles?: Pick<Profile, "full_name" | "nik" | "division">
}

export interface AuditLog {
	id: string
	actor_id: string | null
	action: string
	target_table: string | null
	target_id: string | null
	metadata: Record<string, unknown> | null
	created_at: string
}
