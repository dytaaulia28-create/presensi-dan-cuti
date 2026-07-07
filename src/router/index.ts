import { createRouter, createWebHashHistory } from "@ionic/vue-router"
import type { RouteRecordRaw } from "vue-router"
import { authStore } from "@/stores/auth"

const routes: Array<RouteRecordRaw> = [
	{ path: "/", redirect: "/login" },
	{
		path: "/login",
		component: () => import("@/views/LoginPage.vue"),
	},
	// ---- Area Karyawan ----
	{
		path: "/app/",
		component: () => import("@/views/employee/EmployeeTabs.vue"),
		meta: { requiresAuth: true, role: "employee" },
		children: [
			{ path: "", redirect: "/app/beranda" },
			{
				path: "beranda",
				component: () => import("@/views/employee/EmployeeDashboard.vue"),
			},
			{
				path: "absensi",
				component: () => import("@/views/employee/CheckInPage.vue"),
			},
			{
				path: "riwayat",
				component: () => import("@/views/employee/AttendanceHistory.vue"),
			},
			{
				path: "cuti",
				component: () => import("@/views/employee/LeavePage.vue"),
			},
			{
				path: "profil",
				component: () => import("@/views/employee/ProfilePage.vue"),
			},
		],
	},
	// ---- Area Admin ----
	{
		path: "/admin/",
		component: () => import("@/views/admin/AdminTabs.vue"),
		meta: { requiresAuth: true, role: "admin" },
		children: [
			{ path: "", redirect: "/admin/akun" },
			{
				path: "akun",
				component: () => import("@/views/admin/AdminAccountManagement.vue"),
			},
			{
				path: "log",
				component: () => import("@/views/admin/AdminActivityLog.vue"),
			},
			{
				path: "profil",
				component: () => import("@/views/admin/AdminProfile.vue"),
			},
		],
	},
	// ---- Area HRD ----
	{
		path: "/hrd/",
		component: () => import("@/views/hrd/HrdTabs.vue"),
		meta: { requiresAuth: true, role: "hrd" },
		children: [
			{ path: "", redirect: "/hrd/beranda" },
			{
				path: "beranda",
				component: () => import("@/views/hrd/HrdDashboard.vue"),
			},
			{
				path: "absensi",
				component: () => import("@/views/hrd/HrdAttendance.vue"),
			},
			{
				path: "cuti",
				component: () => import("@/views/hrd/HrdLeave.vue"),
			},
			{
				path: "laporan",
				component: () => import("@/views/hrd/HrdReports.vue"),
			},
			{
				path: "profil",
				component: () => import("@/views/hrd/HrdProfile.vue"),
			},
		],
	},
]

const router = createRouter({
	history: createWebHashHistory(import.meta.env.BASE_URL),
	routes,
})

// Guard: proteksi rute & arahkan sesuai role.
router.beforeEach((to) => {
	const { userId, profile } = authStore.state
	const isLoggedIn = !!userId

	if (to.meta.requiresAuth && !isLoggedIn) {
		return "/login"
	}
	if (to.path === "/login" && isLoggedIn) {
		if (profile?.role === "admin") return "/admin/akun"
		if (profile?.role === "hrd") return "/hrd/beranda"
		return "/app/beranda"
	}
	if (to.meta.role && profile && to.meta.role !== profile.role) {
		if (profile.role === "admin") return "/admin/akun"
		if (profile.role === "hrd") return "/hrd/beranda"
		return "/app/beranda"
	}
	return true
})

export default router
