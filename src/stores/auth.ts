import { reactive, readonly } from "vue"
import { supabase } from "@/lib/supabase"
import type { Profile } from "@/types/database"

interface AuthState {
	userId: string | null
	profile: Profile | null
	loading: boolean
	initialized: boolean
}

const state = reactive<AuthState>({
	userId: null,
	profile: null,
	loading: false,
	initialized: false,
})

async function fetchProfile(userId: string): Promise<void> {
	const { data, error } = await supabase
		.from("profiles")
		.select("*")
		.eq("id", userId)
		.single()
	if (error) {
		console.error("[HRAttend] Gagal memuat profil:", error.message)
		state.profile = null
		return
	}
	state.profile = data as Profile
}

async function init(): Promise<void> {
	if (state.initialized) return
	const { data } = await supabase.auth.getSession()
	if (data.session?.user) {
		state.userId = data.session.user.id
		await fetchProfile(state.userId)
	}
	supabase.auth.onAuthStateChange(async (_event, session) => {
		if (session?.user) {
			state.userId = session.user.id
			await fetchProfile(session.user.id)
		} else {
			state.userId = null
			state.profile = null
		}
	})
	state.initialized = true
}

async function signIn(email: string, password: string): Promise<string | null> {
	state.loading = true
	try {
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		})
		if (error) return error.message
		if (data.user) {
			state.userId = data.user.id
			await fetchProfile(data.user.id)
		}
		return null
	} finally {
		state.loading = false
	}
}

async function signOut(): Promise<void> {
	await supabase.auth.signOut()
	state.userId = null
	state.profile = null
}

function isAdmin(): boolean {
	return state.profile?.role === "admin"
}

export const authStore = {
	state: readonly(state),
	init,
	signIn,
	signOut,
	fetchProfile,
	isAdmin,
}
