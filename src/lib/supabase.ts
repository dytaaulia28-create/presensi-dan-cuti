import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
	// Peringatan jelas saat .env belum diisi.
	console.warn(
		"[HRAttend] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diatur. Salin .env.example menjadi .env dan isi kredensial Supabase Anda.",
	)
}

export const supabase = createClient(
	supabaseUrl ?? "http://localhost",
	supabaseAnonKey ?? "public-anon-key",
	{
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true,
		},
	},
)

export const ATTENDANCE_BUCKET =
	import.meta.env.VITE_ATTENDANCE_BUCKET ?? "attendance-photos"
