<script lang="ts">
	import type { Event, Volunteer } from '$lib/supabase';
	import { dashboard } from '$lib/stores/dashboard.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	type Props = {
		event: Event;
		volunteers: Volunteer[];
	};

	let { event, volunteers }: Props = $props();

	let isExpanded = $state(false);
	let isEditing = $state(false);
	let isDeleting = $state(false);
	let isCreatingWheel = $state(false);
	let copySuccess = $state(false);

	let editName = $state(event.name);
	let editEmoji = $state(event.emoji || '');
	let editEndsAt = $state('');

	$effect(() => {
		if (event.ends_at) {
			const date = new Date(event.ends_at);
			editEndsAt = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
		} else {
			editEndsAt = '';
		}
	});

	async function saveEdits() {
		if (!editName.trim()) return;
		try {
			await dashboard.updateEvent(event.id, {
				name: editName,
				emoji: editEmoji,
				ends_at: editEndsAt || null,
			});
			isEditing = false;
		} catch (err) {
			dashboard.error = err instanceof Error ? err.message : 'Failed to update';
		}
	}

	async function handleToggleActive() {
		try {
			await dashboard.toggleEventActive(event.id);
		} catch (err) {
			dashboard.error = err instanceof Error ? err.message : 'Failed to toggle';
		}
	}

	async function handleDelete() {
		if (!confirm('Delete this event and all its volunteers?')) return;
		isDeleting = true;
		try {
			await dashboard.deleteEvent(event.id);
		} catch (err) {
			dashboard.error = err instanceof Error ? err.message : 'Failed to delete';
		} finally {
			isDeleting = false;
		}
	}

	async function copyNames() {
		const names = volunteers.map((v) => v.full_name).join('\n');
		if (!names) return;
		try {
			await navigator.clipboard.writeText(names);
			copySuccess = true;
			setTimeout(() => (copySuccess = false), 2000);
		} catch {
			dashboard.error = 'Failed to copy';
		}
	}

	async function createWheel() {
		isCreatingWheel = true;
		try {
			const url = await dashboard.createWheelForEvent(event);
			if (url) window.open(url, '_blank', 'noopener,noreferrer');
		} catch (err) {
			dashboard.error = err instanceof Error ? err.message : 'Failed to create wheel';
		} finally {
			isCreatingWheel = false;
		}
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
	}
</script>

<div class="group rounded-xl border border-[#e5e5e5] bg-white transition-all duration-200 hover:border-[#ccc]">
	{#if isEditing}
		<div class="p-5" style="animation: fadeIn 0.15s ease-out">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-[14px] font-semibold text-[#1a1a1a]">Edit event</h3>
				<button
					onclick={() => (isEditing = false)}
					class="rounded-md p-1 text-[#999] transition-colors duration-200 hover:bg-[#f5f5f5] hover:text-[#666]"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="space-y-3">
				<input
					id="edit-name-{event.id}"
					type="text"
					bind:value={editName}
					placeholder="Event name"
					class="h-10 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[13px] text-[#1a1a1a] outline-none transition-all duration-200 hover:border-[#ccc] focus:border-[#1a1a1a] focus:ring-4 focus:ring-[#1a1a1a]/5"
				/>
				<div class="grid gap-3 sm:grid-cols-2">
					<input
						id="edit-emoji-{event.id}"
						type="text"
						maxlength="4"
						bind:value={editEmoji}
						placeholder="Emoji"
						class="h-10 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-center text-[13px] outline-none transition-all duration-200 hover:border-[#ccc] focus:border-[#1a1a1a] focus:ring-4 focus:ring-[#1a1a1a]/5"
					/>
					<input
						id="edit-ends-{event.id}"
						type="datetime-local"
						bind:value={editEndsAt}
						class="h-10 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-[13px] outline-none transition-all duration-200 hover:border-[#ccc] focus:border-[#1a1a1a] focus:ring-4 focus:ring-[#1a1a1a]/5"
					/>
				</div>
			</div>

			<div class="mt-4 flex gap-2">
				<button
					onclick={saveEdits}
					class="h-9 rounded-lg bg-[#1a1a1a] px-4 text-[13px] font-medium text-white transition-all duration-200 hover:bg-[#333] active:scale-[0.98]"
				>
					Save
				</button>
				<button
					onclick={() => (isEditing = false)}
					class="h-9 rounded-lg border border-[#e5e5e5] px-4 text-[13px] font-medium text-[#666] transition-all duration-200 hover:border-[#ccc]"
				>
					Cancel
				</button>
			</div>
		</div>
	{:else}
		<div class="p-5">
			<div class="flex items-start justify-between gap-4">
				<div class="flex items-start gap-4">
					<button
						onclick={handleToggleActive}
						class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200"
						class:bg-[#1a1a1a]={event.is_active}
						class:border-[#1a1a1a]={event.is_active}
						class:border-[#d4d4d4]={!event.is_active}
						class:hover:border-[#999]={!event.is_active}
						aria-label={event.is_active ? 'Deactivate event' : 'Activate event'}
					>
						{#if event.is_active}
							<svg class="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
								<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
							</svg>
						{/if}
					</button>

					<div>
						<div class="flex items-center gap-2">
							{#if event.emoji}<span class="text-[16px]">{event.emoji}</span>{/if}
							<span class="text-[15px] font-semibold text-[#1a1a1a]">{event.name}</span>
							{#if event.is_active}
								<span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">Active</span>
							{/if}
						</div>
						<div class="mt-1 flex flex-wrap items-center gap-x-3 text-[12px] text-[#888]">
							{#if auth.isSuperuser}
								<span>{dashboard.getCouncilName(event.council_id)}</span>
							{/if}
							{#if event.ends_at}
								<span>{formatDate(event.ends_at)}</span>
							{/if}
							<span>{volunteers.length} volunteer{volunteers.length !== 1 ? 's' : ''}</span>
						</div>
					</div>
				</div>

				<div class="flex items-center gap-1">
					<button
						onclick={() => (isExpanded = !isExpanded)}
						class="rounded-md px-2.5 py-1.5 text-[12px] font-medium text-[#666] transition-all duration-200 hover:bg-[#f5f5f5] hover:text-[#1a1a1a]"
					>
						{isExpanded ? 'Hide' : 'View'}
					</button>
					<button
						onclick={copyNames}
						disabled={volunteers.length === 0 || copySuccess}
						class="rounded-md px-2.5 py-1.5 text-[12px] font-medium text-[#666] transition-all duration-200 hover:bg-[#f5f5f5] hover:text-[#1a1a1a] disabled:text-[#ccc] disabled:hover:bg-transparent"
					>
						{copySuccess ? 'Copied!' : 'Copy'}
					</button>
					<button
						onclick={createWheel}
						disabled={isCreatingWheel || volunteers.length === 0}
						class="rounded-md px-2.5 py-1.5 text-[12px] font-medium text-[#666] transition-all duration-200 hover:bg-[#f5f5f5] hover:text-[#1a1a1a] disabled:text-[#ccc] disabled:hover:bg-transparent"
					>
						{isCreatingWheel ? '...' : 'Wheel'}
					</button>
					<button
						onclick={() => { editName = event.name; editEmoji = event.emoji || ''; isEditing = true; }}
						class="rounded-md px-2.5 py-1.5 text-[12px] font-medium text-[#666] transition-all duration-200 hover:bg-[#f5f5f5] hover:text-[#1a1a1a]"
					>
						Edit
					</button>
					<button
						onclick={handleDelete}
						disabled={isDeleting}
						class="rounded-md px-2.5 py-1.5 text-[12px] font-medium text-red-500 transition-all duration-200 hover:bg-red-50 disabled:text-[#ccc]"
					>
						{isDeleting ? '...' : 'Delete'}
					</button>
				</div>
			</div>
		</div>

		{#if isExpanded}
			<div class="border-t border-[#e5e5e5] bg-[#fafafa]/50" style="animation: expandDown 0.2s ease-out">
				{#if volunteers.length === 0}
					<p class="px-5 py-8 text-center text-[13px] text-[#888]">No volunteers yet</p>
				{:else}
					<div class="overflow-hidden">
						<table class="w-full">
							<thead>
								<tr class="border-b border-[#e5e5e5] text-left">
									<th class="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#888]">Name</th>
									<th class="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#888]">Status</th>
									<th class="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-[#888]">Submitted</th>
								</tr>
							</thead>
							<tbody>
								{#each volunteers as v, i (v.id)}
									<tr
										class="border-b border-[#e5e5e5] last:border-0 transition-colors duration-150 hover:bg-white"
										style="animation: fadeIn 0.2s ease-out {i * 0.03}s both"
									>
										<td class="px-5 py-3 text-[13px] font-medium text-[#1a1a1a]">{v.full_name}</td>
										<td class="px-5 py-3">
											<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
												class:bg-blue-50={!v.has_volunteered_before}
												class:text-blue-600={!v.has_volunteered_before}
												class:bg-[#f0f0f0]={v.has_volunteered_before}
												class:text-[#666]={v.has_volunteered_before}
											>
												{v.has_volunteered_before ? 'Returning' : 'First time'}
											</span>
										</td>
										<td class="px-5 py-3 text-right text-[12px] text-[#888]">{formatDate(v.created_at)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes expandDown {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
