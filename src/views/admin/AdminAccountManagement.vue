<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<ion-toolbar>
				<ion-title>Manajemen Akun</ion-title>
			</ion-toolbar>
		</ion-header>
		<ion-content :fullscreen="true">
			<div class="page-pad">
				<ion-searchbar
					v-model="query"
					placeholder="Cari nama / NIK"
					class="search"
				></ion-searchbar>

				<!-- List Akun -->
				<div v-if="filtered.length === 0" class="empty-state">
					<ion-icon :icon="peopleOutline" />
					<p>Tidak ada akun ditemukan.</p>
				</div>

				<div v-for="e in filtered" :key="e.id" class="card emp">
					<div class="emp-main">
						<div class="emp-avatar">{{ initials(e.full_name) }}</div>
						<div style="flex:1">
							<strong>{{ e.full_name }}</strong>
							<div class="muted" style="font-size:.75rem">
								{{ e.nik }} · {{ e.division || 'Tanpa Divisi' }}
							</div>
							<div style="display:flex; align-items:center; gap:6px; margin-top:4px">
								<span class="role-tag" :class="e.role">
									{{ e.role === 'admin' ? 'Admin' : e.role === 'hrd' ? 'HRD' : 'Karyawan' }}
								</span>
								<span class="status-tag" :class="e.is_active ? 'active' : 'inactive'">
									{{ e.is_active ? 'Aktif' : 'Non-aktif' }}
								</span>
							</div>
						</div>
					</div>

					<div class="emp-actions">
						<!-- Toggle Keaktifan (Hanya Admin) -->
						<ion-toggle
							:checked="e.is_active"
							@ionChange="onToggleActive(e, $event)"
							style="margin-bottom:8px"
						></ion-toggle>
						<div style="display:flex; gap:6px">
							<ion-button size="small" fill="clear" color="primary" @click="openEdit(e)">
								<ion-icon slot="icon-only" :icon="createOutline" />
							</ion-button>
							<ion-button size="small" fill="clear" color="danger" @click="confirmDelete(e)">
								<ion-icon slot="icon-only" :icon="trashOutline" />
							</ion-button>
						</div>
					</div>
				</div>

				<!-- Floating Action Button untuk Tambah Akun -->
				<ion-fab vertical="bottom" horizontal="end" slot="fixed">
					<ion-fab-button @click="showAddModal = true">
						<ion-icon :icon="addOutline" />
					</ion-fab-button>
				</ion-fab>

				<!-- MODAL TAMBAH AKUN -->
				<ion-modal :is-open="showAddModal" @didDismiss="showAddModal = false">
					<ion-header class="ion-no-border">
						<ion-toolbar>
							<ion-title>Tambah Akun Baru</ion-title>
							<ion-buttons slot="end">
								<ion-button @click="showAddModal = false">Batal</ion-button>
							</ion-buttons>
						</ion-toolbar>
					</ion-header>
					<ion-content class="ion-padding">
						<form @submit.prevent="submitAdd">
							<label class="form-label">Email</label>
							<ion-input v-model="newForm.email" type="email" fill="outline" required placeholder="nama@perusahaan.com" class="field"></ion-input>

							<label class="form-label">Password</label>
							<ion-input v-model="newForm.password" type="password" fill="outline" required placeholder="minimal 6 karakter" class="field"></ion-input>

							<label class="form-label">Nama Lengkap</label>
							<ion-input v-model="newForm.full_name" type="text" fill="outline" required placeholder="Nama Lengkap Karyawan" class="field"></ion-input>

							<label class="form-label">NIK (Nomor Induk Karyawan)</label>
							<ion-input v-model="newForm.nik" type="text" fill="outline" required placeholder="Contoh: K0002" class="field"></ion-input>

							<label class="form-label">Jenis Kelamin</label>
							<ion-select v-model="newForm.gender" fill="outline" placeholder="Pilih Jenis Kelamin" class="field">
								<ion-select-option value="male">Laki-laki</ion-select-option>
								<ion-select-option value="female">Perempuan</ion-select-option>
							</ion-select>

							<label class="form-label">Role Akses</label>
							<ion-select v-model="newForm.role" fill="outline" placeholder="Pilih Role" class="field">
								<ion-select-option value="employee">Karyawan</ion-select-option>
								<ion-select-option value="hrd">HRD</ion-select-option>
								<ion-select-option value="admin">Admin</ion-select-option>
							</ion-select>

							<label class="form-label">Divisi</label>
							<ion-input v-model="newForm.division" type="text" fill="outline" placeholder="Contoh: Teknologi, HR, Keuangan" class="field"></ion-input>

							<ion-button type="submit" expand="block" style="margin-top:20px" :disabled="submitting">
								<ion-spinner v-if="submitting" name="crescent" />
								<span v-else>Simpan Akun</span>
							</ion-button>
						</form>
					</ion-content>
				</ion-modal>

				<!-- MODAL EDIT AKUN -->
				<ion-modal :is-open="showEditModal" @didDismiss="showEditModal = false">
					<ion-header class="ion-no-border">
						<ion-toolbar>
							<ion-title>Edit Akun</ion-title>
							<ion-buttons slot="end">
								<ion-button @click="showEditModal = false">Batal</ion-button>
							</ion-buttons>
						</ion-toolbar>
					</ion-header>
					<ion-content class="ion-padding">
						<form @submit.prevent="submitEdit">
							<label class="form-label">Nama Lengkap</label>
							<ion-input v-model="editForm.full_name" type="text" fill="outline" required placeholder="Nama Lengkap Karyawan" class="field"></ion-input>

							<label class="form-label">NIK (Nomor Induk Karyawan)</label>
							<ion-input v-model="editForm.nik" type="text" fill="outline" required placeholder="Contoh: K0002" class="field"></ion-input>

							<label class="form-label">Jenis Kelamin</label>
							<ion-select v-model="editForm.gender" fill="outline" placeholder="Pilih Jenis Kelamin" class="field">
								<ion-select-option value="male">Laki-laki</ion-select-option>
								<ion-select-option value="female">Perempuan</ion-select-option>
							</ion-select>

							<label class="form-label">Role Akses</label>
							<ion-select v-model="editForm.role" fill="outline" placeholder="Pilih Role" class="field">
								<ion-select-option value="employee">Karyawan</ion-select-option>
								<ion-select-option value="hrd">HRD</ion-select-option>
								<ion-select-option value="admin">Admin</ion-select-option>
							</ion-select>

							<label class="form-label">Divisi</label>
							<ion-input v-model="editForm.division" type="text" fill="outline" placeholder="Contoh: Teknologi, HR, Keuangan" class="field"></ion-input>

							<ion-button type="submit" expand="block" style="margin-top:20px" :disabled="submitting">
								<ion-spinner v-if="submitting" name="crescent" />
								<span v-else>Update Akun</span>
							</ion-button>
						</form>
					</ion-content>
				</ion-modal>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import {
	IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
	IonSearchbar, IonToggle, IonIcon, IonFab, IonFabButton,
	IonModal, IonButtons, IonButton, IonInput, IonSelect, IonSelectOption,
	IonSpinner, toastController, alertController,
} from "@ionic/vue"
import { peopleOutline, addOutline, createOutline, trashOutline } from "ionicons/icons"
import { getEmployees, toggleEmployeeActive, updateEmployee, createEmployee, deleteEmployee } from "@/composables/useAdmin"
import { logActivity } from "@/lib/audit"
import { authStore } from "@/stores/auth"
import type { Profile } from "@/types/database"

const employees = ref<Profile[]>([])
const query = ref("")
const submitting = ref(false)

const showAddModal = ref(false)
const newForm = ref({
	email: "",
	password: "",
	full_name: "",
	nik: "",
	gender: "male" as "male" | "female",
	role: "employee" as "employee" | "hrd" | "admin",
	division: "",
})

const showEditModal = ref(false)
const editingId = ref<string | null>(null)
const editForm = ref({
	full_name: "",
	nik: "",
	gender: "male" as "male" | "female",
	role: "employee" as "employee" | "hrd" | "admin",
	division: "",
})

const filtered = computed(() => {
	const q = query.value.toLowerCase().trim()
	if (!q) return employees.value
	return employees.value.filter(
		(e) =>
			e.full_name.toLowerCase().includes(q) ||
			e.nik.toLowerCase().includes(q),
	)
})

function initials(name: string) {
	return name.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase()
}

async function load() {
	employees.value = await getEmployees()
}

async function onToggleActive(emp: Profile, ev: CustomEvent) {
	const checked = (ev.detail as { checked: boolean }).checked
	if (emp.is_active === checked) return
	
	const adminId = authStore.state.userId || ""
	await toggleEmployeeActive(emp.id, checked)
	emp.is_active = checked

	// Log audit
	await logActivity(adminId, checked ? "activate_account" : "deactivate_account", "profiles", emp.id, {
		nik: emp.nik,
		name: emp.full_name,
	})

	const t = await toastController.create({
		message: checked ? `Akun ${emp.full_name} diaktifkan.` : `Akun ${emp.full_name} dinonaktifkan.`,
		duration: 2000, color: "success", position: "top",
	})
	await t.present()
}

async function submitAdd() {
	const adminId = authStore.state.userId || ""
	submitting.value = true
	const res = await createEmployee(newForm.value)
	submitting.value = false
	if (res.ok) {
		const t = await toastController.create({ message: "Akun baru berhasil ditambahkan", duration: 2500, color: "success", position: "top" })
		await t.present()
		
		// Log audit
		await logActivity(adminId, "create_account", "profiles", undefined, {
			nik: newForm.value.nik,
			name: newForm.value.full_name,
			role: newForm.value.role,
		})

		showAddModal.value = false
		newForm.value = {
			email: "",
			password: "",
			full_name: "",
			nik: "",
			gender: "male",
			role: "employee",
			division: "",
		}
		await load()
	} else {
		const t = await toastController.create({ message: "Gagal membuat akun: " + res.message, duration: 3000, color: "danger", position: "top" })
		await t.present()
	}
}

function openEdit(emp: Profile) {
	editingId.value = emp.id
	editForm.value = {
		full_name: emp.full_name,
		nik: emp.nik,
		gender: emp.gender,
		role: emp.role,
		division: emp.division || "",
	}
	showEditModal.value = true
}

async function submitEdit() {
	if (!editingId.value) return
	const adminId = authStore.state.userId || ""
	submitting.value = true
	try {
		await updateEmployee(editingId.value, editForm.value)
		
		// Log audit
		await logActivity(adminId, "update_account", "profiles", editingId.value, {
			nik: editForm.value.nik,
			name: editForm.value.full_name,
			role: editForm.value.role,
		})

		const t = await toastController.create({ message: "Akun berhasil diperbarui", duration: 2500, color: "success", position: "top" })
		await t.present()
		showEditModal.value = false
		await load()
	} catch (err: any) {
		const t = await toastController.create({ message: "Gagal memperbarui akun: " + err.message, duration: 3000, color: "danger", position: "top" })
		await t.present()
	} finally {
		submitting.value = false
	}
}

async function confirmDelete(emp: Profile) {
	const alert = await alertController.create({
		header: "Hapus Akun",
		message: `Apakah Anda yakin ingin menghapus akun ${emp.full_name} (${emp.nik}) secara permanen? Seluruh riwayat absen dan cuti juga akan terhapus.`,
		buttons: [
			{ text: "Batal", role: "cancel" },
			{
				text: "Hapus",
				role: "destructive",
				handler: async () => {
					const adminId = authStore.state.userId || ""
					const res = await deleteEmployee(emp.id)
					if (res.ok) {
						// Log audit
						await logActivity(adminId, "delete_account", "profiles", emp.id, {
							nik: emp.nik,
							name: emp.full_name,
						})

						const t = await toastController.create({ message: `Akun ${emp.full_name} telah dihapus.`, duration: 2500, color: "success", position: "top" })
						await t.present()
						await load()
					} else {
						const t = await toastController.create({ message: "Gagal menghapus akun: " + res.message, duration: 3000, color: "danger", position: "top" })
						await t.present()
					}
				},
			},
		],
	})
	await alert.present()
}

onMounted(load)
</script>

<style scoped>
.search { --background: var(--surface); --border-radius: 12px; padding: 0; margin-bottom: 12px; }
.emp { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 12px; }
.emp-main { display: flex; gap: 12px; align-items: center; }
.emp-avatar {
	width: 44px; height: 44px; border-radius: 12px; background: var(--surface-3);
	display: flex; align-items: center; justify-content: center; font-weight: 700; font-family: "Outfit";
}
.role-tag { font-size: .62rem; padding: 2px 8px; border-radius: 999px; font-weight:600; text-transform: uppercase; }
.role-tag.admin { background: var(--primary-soft); color: #b6a1ff; }
.role-tag.hrd { background: rgba(79, 195, 247, 0.15); color: #4fc3f7; }
.role-tag.employee { background: var(--surface-3); color: var(--text-2); }
.status-tag { font-size: .62rem; padding: 2px 8px; border-radius: 999px; font-weight:600; text-transform: uppercase; }
.status-tag.active { background: rgba(76, 175, 80, 0.15); color: #81c784; }
.status-tag.inactive { background: rgba(244, 67, 54, 0.15); color: #e57373; }
.emp-actions { display: flex; flex-direction: column; align-items: flex-end; }
.field { margin-bottom: 10px; }
</style>
