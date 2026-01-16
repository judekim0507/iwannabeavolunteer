<script lang="ts">
	import { dashboard } from '$lib/stores/dashboard.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	const stats = $derived(dashboard.stats);
</script>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
	<div class="rounded-xl border border-[#e5e5e5] bg-white p-5 transition-all duration-200 hover:border-[#ccc]">
		<p class="text-[12px] font-medium uppercase tracking-wide text-[#999]">Active</p>
		<p class="mt-1 text-[28px] font-semibold tracking-tight text-[#1a1a1a]">{stats.activeEvents}</p>
	</div>

	<div class="rounded-xl border border-[#e5e5e5] bg-white p-5 transition-all duration-200 hover:border-[#ccc]">
		<p class="text-[12px] font-medium uppercase tracking-wide text-[#999]">Events</p>
		<p class="mt-1 text-[28px] font-semibold tracking-tight text-[#1a1a1a]">{stats.totalEvents}</p>
	</div>

	<div class="rounded-xl border border-[#e5e5e5] bg-white p-5 transition-all duration-200 hover:border-[#ccc]">
		<p class="text-[12px] font-medium uppercase tracking-wide text-[#999]">Volunteers</p>
		<p class="mt-1 text-[28px] font-semibold tracking-tight text-[#1a1a1a]">{stats.volunteers}</p>
	</div>

	{#if auth.isSuperuser}
		<div class="rounded-xl border border-[#e5e5e5] bg-white p-5 transition-all duration-200 hover:border-[#ccc]">
			<p class="text-[12px] font-medium uppercase tracking-wide text-[#999]">Councils</p>
			<p class="mt-1 text-[28px] font-semibold tracking-tight text-[#1a1a1a]">{stats.councils}</p>
		</div>
	{/if}
</div>
