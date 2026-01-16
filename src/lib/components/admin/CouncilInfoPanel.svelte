<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { dashboard } from '$lib/stores/dashboard.svelte';
</script>

<div class="rounded-xl border border-[#e5e5e5] bg-white p-5">
	<h3 class="mb-3 text-[14px] font-semibold text-[#1a1a1a]">Your Council</h3>
	{#if auth.userCouncil}
		<p class="text-[15px] font-medium text-[#1a1a1a]">{auth.userCouncil.name}</p>
		<p class="mt-2 text-[13px] text-[#888]">
			{dashboard.events.length} event{dashboard.events.length !== 1 ? 's' : ''} · {dashboard.volunteers.length} volunteer{dashboard.volunteers.length !== 1 ? 's' : ''}
		</p>
	{:else}
		<p class="text-[13px] text-[#888]">Not assigned to a council yet.</p>
	{/if}
</div>
