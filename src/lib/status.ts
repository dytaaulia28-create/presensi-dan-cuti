import type { AttendanceStatus, LeaveStatus } from "@/types/database"

export const attendanceLabels: Record<AttendanceStatus, string> = {
	present: "Hadir",
	late: "Terlambat",
	absent: "Alpha",
	on_leave: "Cuti",
	sick: "Sakit",
}

export const leaveLabels: Record<LeaveStatus, string> = {
	pending: "Menunggu",
	approved: "Disetujui",
	rejected: "Ditolak",
}
