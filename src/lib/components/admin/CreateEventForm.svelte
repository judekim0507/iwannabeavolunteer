<script lang="ts">
	import { dashboard } from '$lib/stores/dashboard.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	let name = $state('');
	let emoji = $state('');
	let endsAt = $state('');
	let councilId = $state('');
	let isCreating = $state(false);
	let isOpen = $state(false);

	$effect(() => {
		if (!auth.isSuperuser && auth.userCouncil) {
			councilId = auth.userCouncil.id;
		} else if (auth.isSuperuser && dashboard.councils.length > 0 && !councilId) {
			councilId = dashboard.councils[0].id;
		}
	});

	async function handleSubmit() {
		if (!name.trim()) return;

		const targetCouncilId = auth.isSuperuser ? councilId : (auth.userCouncil?.id || auth.adminRole?.council_id);
		if (!targetCouncilId) {
			dashboard.error = 'Please select a council';
			return;
		}

		isCreating = true;
		try {
			await dashboard.createEvent(name, emoji, endsAt || null, targetCouncilId);
			name = '';
			emoji = '';
			endsAt = '';
			isOpen = false;
		} catch (err) {
			dashboard.error = err instanceof Error ? err.message : 'Failed to create event';
		} finally {
			isCreating = false;
		}
	}

	function close() {
		isOpen = false;
		name = '';
		emoji = '';
		endsAt = '';
	}
</script>

<div class="mt-8 mb-6">
	{#if !isOpen}
		<button
			type="button"
			onclick={() => (isOpen = true)}
			class="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1a1a1a] px-4 text-[13px] font-medium text-white transition-all duration-200 hover:bg-[#333] active:scale-[0.98]"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
			</svg>
			New event
		</button>
	{:else}
		<div
			class="overflow-hidden rounded-xl border border-[#e5e5e5] bg-white transition-all duration-300"
			style="animation: slideDown 0.2s ease-out"
		>
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="p-5">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-[15px] font-semibold text-[#1a1a1a]">Create event</h3>
					<button
						type="button"
						onclick={close}
						class="rounded-md p-1 text-[#999] transition-colors duration-200 hover:bg-[#f5f5f5] hover:text-[#666]"
					>
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<div class="space-y-4">
					<div class="grid gap-4 sm:grid-cols-2">
						{#if auth.isSuperuser}
							<div>
								<label for="create-council" class="mb-2 block text-[12px] font-medium text-[#666]">Council</label>
								<select
									id="create-council"
									bind:value={councilId}
									disabled={isCreating}
									class="h-10 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[13px] text-[#1a1a1a] outline-none transition-all duration-200 hover:border-[#ccc] focus:border-[#1a1a1a] focus:ring-4 focus:ring-[#1a1a1a]/5 disabled:bg-[#fafafa]"
								>
									{#each dashboard.councils as council (council.id)}
										<option value={council.id}>{council.name}</option>
									{/each}
								</select>
							</div>
						{/if}

						<div class:sm:col-span-2={!auth.isSuperuser}>
							<label for="create-name" class="mb-2 block text-[12px] font-medium text-[#666]">Event name</label>
							<input
								id="create-name"
								type="text"
								placeholder="e.g. Bubble Tea Fundraiser"
								bind:value={name}
								disabled={isCreating}
								class="h-10 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[13px] text-[#1a1a1a] outline-none transition-all duration-200 placeholder:text-[#999] hover:border-[#ccc] focus:border-[#1a1a1a] focus:ring-4 focus:ring-[#1a1a1a]/5 disabled:bg-[#fafafa]"
							/>
						</div>
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						<div>
							<label for="create-emoji" class="mb-2 block text-[12px] font-medium text-[#666]">Emoji (optional)</label>
							<input
								id="create-emoji"
								type="text"
								maxlength="4"
								placeholder="🎉"
								bind:value={emoji}
								disabled={isCreating}
								class="h-10 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-center text-[13px] text-[#1a1a1a] outline-none transition-all duration-200 placeholder:text-[#999] hover:border-[#ccc] focus:border-[#1a1a1a] focus:ring-4 focus:ring-[#1a1a1a]/5 disabled:bg-[#fafafa]"
							/>
						</div>
						<div>
							<label for="create-ends" class="mb-2 block text-[12px] font-medium text-[#666]">End date (optional)</label>
							<input
								id="create-ends"
								type="datetime-local"
								bind:value={endsAt}
								disabled={isCreating}
								class="h-10 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[13px] text-[#1a1a1a] outline-none transition-all duration-200 hover:border-[#ccc] focus:border-[#1a1a1a] focus:ring-4 focus:ring-[#1a1a1a]/5 disabled:bg-[#fafafa]"
							/>
						</div>
					</div>
				</div>

				<div class="mt-5 flex gap-3">
					<button
						type="submit"
						disabled={isCreating || !name.trim() || (auth.isSuperuser && !councilId)}
						class="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1a1a1a] px-4 text-[13px] font-medium text-white transition-all duration-200 hover:bg-[#333] active:scale-[0.98] disabled:bg-[#e5e5e5] disabled:text-[#999]"
					>
						{#if isCreating}
							<span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
							Creating...
						{:else}
							Create event
						{/if}
					</button>
					<button
						type="button"
						onclick={close}
						class="h-10 rounded-lg border border-[#e5e5e5] bg-white px-4 text-[13px] font-medium text-[#666] transition-all duration-200 hover:border-[#ccc] hover:text-[#1a1a1a]"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{/if}
</div>

<style>
	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
