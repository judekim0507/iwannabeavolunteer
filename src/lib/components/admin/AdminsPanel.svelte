<script lang="ts">
	import { dashboard } from '$lib/stores/dashboard.svelte';

	let email = $state('');
	let password = $state('');
	let councilId = $state('');
	let isCreating = $state(false);
	let deletingId = $state<string | null>(null);
	let isOpen = $state(false);

	async function handleCreate() {
		if (!email.trim() || !password.trim() || !councilId) return;
		isCreating = true;
		try {
			await dashboard.createAdmin(email, password, councilId);
			email = '';
			password = '';
			councilId = '';
			isOpen = false;
		} catch (err) {
			dashboard.error = err instanceof Error ? err.message : 'Failed to create';
		} finally {
			isCreating = false;
		}
	}

	async function handleDelete(adminId: string, userId: string) {
		if (!confirm('Remove this admin?')) return;
		deletingId = adminId;
		try {
			await dashboard.deleteAdmin(adminId, userId);
		} catch (err) {
			dashboard.error = err instanceof Error ? err.message : 'Failed to delete';
		} finally {
			deletingId = null;
		}
	}

	function close() {
		isOpen = false;
		email = '';
		password = '';
		councilId = '';
	}
</script>

<div class="rounded-xl border border-[#e5e5e5] bg-white">
	<div class="flex items-center justify-between border-b border-[#e5e5e5] px-5 py-4">
		<h3 class="text-[14px] font-semibold text-[#1a1a1a]">Admins</h3>
		<button
			onclick={() => (isOpen = !isOpen)}
			class="rounded-md px-2.5 py-1 text-[12px] font-medium text-[#666] transition-all duration-200 hover:bg-[#f5f5f5] hover:text-[#1a1a1a]"
		>
			{isOpen ? 'Cancel' : '+ Add'}
		</button>
	</div>

	{#if isOpen}
		<form onsubmit={(e) => { e.preventDefault(); handleCreate(); }} class="space-y-3 border-b border-[#e5e5e5] p-4" style="animation: fadeIn 0.15s ease-out">
			<input
				id="admin-email"
				type="email"
				placeholder="Email"
				bind:value={email}
				disabled={isCreating}
				class="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[13px] outline-none transition-all duration-200 placeholder:text-[#999] hover:border-[#ccc] focus:border-[#1a1a1a] focus:ring-4 focus:ring-[#1a1a1a]/5 disabled:bg-[#fafafa]"
			/>
			<input
				id="admin-password"
				type="password"
				placeholder="Password"
				bind:value={password}
				disabled={isCreating}
				class="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[13px] outline-none transition-all duration-200 placeholder:text-[#999] hover:border-[#ccc] focus:border-[#1a1a1a] focus:ring-4 focus:ring-[#1a1a1a]/5 disabled:bg-[#fafafa]"
			/>
			<select
				id="admin-council"
				bind:value={councilId}
				disabled={isCreating}
				class="h-9 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[13px] outline-none transition-all duration-200 hover:border-[#ccc] focus:border-[#1a1a1a] focus:ring-4 focus:ring-[#1a1a1a]/5 disabled:bg-[#fafafa]"
			>
				<option value="">Select council</option>
				{#each dashboard.councils as council (council.id)}
					<option value={council.id}>{council.name}</option>
				{/each}
			</select>
			<div class="flex gap-2 pt-1">
				<button
					type="submit"
					disabled={isCreating || !email.trim() || !password.trim() || !councilId}
					class="h-9 rounded-lg bg-[#1a1a1a] px-4 text-[13px] font-medium text-white transition-all duration-200 hover:bg-[#333] active:scale-[0.98] disabled:bg-[#e5e5e5] disabled:text-[#999]"
				>
					{isCreating ? 'Creating...' : 'Create'}
				</button>
				<button
					type="button"
					onclick={close}
					class="h-9 rounded-lg border border-[#e5e5e5] px-4 text-[13px] font-medium text-[#666] transition-all duration-200 hover:border-[#ccc]"
				>
					Cancel
				</button>
			</div>
		</form>
	{/if}

	<div class="divide-y divide-[#e5e5e5]">
		{#if dashboard.admins.length === 0}
			<p class="px-5 py-6 text-center text-[13px] text-[#888]">No admins yet</p>
		{:else}
			{#each dashboard.admins as admin (admin.id)}
				<div class="group flex items-center justify-between px-5 py-3 transition-colors duration-150 hover:bg-[#fafafa]">
					<div>
						<span class="text-[13px] font-medium text-[#1a1a1a]">{admin.email}</span>
						<span class="ml-2 text-[12px] text-[#888]">
							{admin.role === 'superuser' ? 'Superuser' : dashboard.getCouncilName(admin.council_id)}
						</span>
					</div>
					{#if admin.role !== 'superuser'}
						<button
							onclick={() => handleDelete(admin.id, admin.user_id)}
							disabled={deletingId === admin.id}
							class="rounded-md px-2 py-1 text-[12px] text-[#999] opacity-0 transition-all duration-200 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:opacity-50"
						>
							{deletingId === admin.id ? '...' : 'Remove'}
						</button>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
</style>
