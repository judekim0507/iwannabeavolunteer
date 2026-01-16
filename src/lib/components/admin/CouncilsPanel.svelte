<script lang="ts">
	import { dashboard } from '$lib/stores/dashboard.svelte';

	let newName = $state('');
	let isCreating = $state(false);
	let deletingId = $state<string | null>(null);
	let isOpen = $state(false);

	async function handleCreate() {
		if (!newName.trim()) return;
		isCreating = true;
		try {
			await dashboard.createCouncil(newName);
			newName = '';
			isOpen = false;
		} catch (err) {
			dashboard.error = err instanceof Error ? err.message : 'Failed to create';
		} finally {
			isCreating = false;
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Delete this council and all its events?')) return;
		deletingId = id;
		try {
			await dashboard.deleteCouncil(id);
		} catch (err) {
			dashboard.error = err instanceof Error ? err.message : 'Failed to delete';
		} finally {
			deletingId = null;
		}
	}
</script>

<div class="rounded-xl border border-[#e5e5e5] bg-white">
	<div class="flex items-center justify-between border-b border-[#e5e5e5] px-5 py-4">
		<h3 class="text-[14px] font-semibold text-[#1a1a1a]">Councils</h3>
		<button
			onclick={() => (isOpen = !isOpen)}
			class="rounded-md px-2.5 py-1 text-[12px] font-medium text-[#666] transition-all duration-200 hover:bg-[#f5f5f5] hover:text-[#1a1a1a]"
		>
			{isOpen ? 'Cancel' : '+ Add'}
		</button>
	</div>

	{#if isOpen}
		<form onsubmit={(e) => { e.preventDefault(); handleCreate(); }} class="border-b border-[#e5e5e5] p-4" style="animation: fadeIn 0.15s ease-out">
			<div class="flex gap-2">
				<input
					type="text"
					placeholder="Council name"
					bind:value={newName}
					disabled={isCreating}
					class="h-9 flex-1 rounded-lg border border-[#e5e5e5] bg-white px-3 text-[13px] outline-none transition-all duration-200 placeholder:text-[#999] hover:border-[#ccc] focus:border-[#1a1a1a] focus:ring-4 focus:ring-[#1a1a1a]/5 disabled:bg-[#fafafa]"
				/>
				<button
					type="submit"
					disabled={isCreating || !newName.trim()}
					class="h-9 rounded-lg bg-[#1a1a1a] px-4 text-[13px] font-medium text-white transition-all duration-200 hover:bg-[#333] active:scale-[0.98] disabled:bg-[#e5e5e5] disabled:text-[#999]"
				>
					{isCreating ? '...' : 'Add'}
				</button>
			</div>
		</form>
	{/if}

	<div class="divide-y divide-[#e5e5e5]">
		{#if dashboard.councils.length === 0}
			<p class="px-5 py-6 text-center text-[13px] text-[#888]">No councils yet</p>
		{:else}
			{#each dashboard.councils as council (council.id)}
				<div class="group flex items-center justify-between px-5 py-3 transition-colors duration-150 hover:bg-[#fafafa]">
					<span class="text-[13px] font-medium text-[#1a1a1a]">{council.name}</span>
					<button
						onclick={() => handleDelete(council.id)}
						disabled={deletingId === council.id}
						class="rounded-md px-2 py-1 text-[12px] text-[#999] opacity-0 transition-all duration-200 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:opacity-50"
					>
						{deletingId === council.id ? '...' : 'Delete'}
					</button>
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
