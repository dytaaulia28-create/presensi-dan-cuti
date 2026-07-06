import { supabase } from "./supabase"

// Mencatat aktivitas penting ke tabel audit_logs.
export async function logActivity(
	actorId: string,
	action: string,
	targetTable?: string,
	targetId?: string,
	metadata?: Record<string, unknown>,
): Promise<void> {
	try {
		await supabase.from("audit_logs").insert({
			actor_id: actorId,
			action,
			target_table: targetTable ?? null,
			target_id: targetId ?? null,
			metadata: {
				...metadata,
				user_agent: navigator.userAgent,
				client_time: new Date().toISOString(),
			},
		})
	} catch (err) {
		console.error("[HRAttend] Gagal mencatat audit log:", err)
	}
}
