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
			{ path: "", redirect: "/admin/beranda" },
			{
				path: "beranda",
				component: () => import("@/views/admin/AdminDashboard.vue"),
			},
			{
				path: "karyawan",
				component: () => import("@/views/admin/EmployeeManagement.vue"),
			},
			{
				path: "absensi",
				component: () => import("@/views/admin/AttendanceMonitor.vue"),
			},
			{
				path: "cuti",
				component: () => import("@/views/admin/LeaveApproval.vue"),
			},
			{
				path: "laporan",
				component: () => import("@/views/admin/ReportsPage.vue"),
			},
			{
				path: "pengaturan",
				component: () => import("@/views/admin/SettingsPage.vue"),
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
		return profile?.role === "admin" ? "/admin/beranda" : "/app/beranda"
	}
	if (to.meta.role && profile && to.meta.role !== profile.role) {
		return profile.role === "admin" ? "/admin/beranda" : "/app/beranda"
	}
	return true
})

export default router
