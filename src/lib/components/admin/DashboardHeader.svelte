<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { dashboard } from '$lib/stores/dashboard.svelte';

	async function handleLogout() {
		await auth.signOut();
		dashboard.reset();
	}
</script>

<header class="flex items-center justify-between py-6">
	<div class="flex items-center gap-4">
		<h1 class="text-[22px] font-semibold tracking-tight text-[#1a1a1a]">
			{auth.isSuperuser ? 'Dashboard' : auth.userCouncil?.name ?? 'Dashboard'}
		</h1>
		{#if auth.isSuperuser}
			<span class="rounded-full bg-[#f0f0f0] px-2.5 py-1 text-[11px] font-medium text-[#666]">Superuser</span>
		{/if}
	</div>

	<div class="flex items-center gap-5">
		{#if auth.isSuperuser}
			<select
				bind:value={dashboard.councilFilter}
				class="h-9 rounded-lg border border-[#e5e5e5] bg-white px-3 pr-8 text-[13px] text-[#1a1a1a] outline-none transition-all duration-200 hover:border-[#ccc] focus:border-[#1a1a1a] focus:ring-4 focus:ring-[#1a1a1a]/5"
			>
				<option value={null}>All councils</option>
				{#each dashboard.councils as council (council.id)}
					<option value={council.id}>{council.name}</option>
				{/each}
			</select>
		{/if}

		<span class="text-[13px] text-[#666]">{auth.user?.email}</span>

		<button
			type="button"
			onclick={handleLogout}
			class="text-[13px] text-[#666] transition-colors duration-200 hover:text-[#1a1a1a]"
		>
			Sign out
		</button>
	</div>
</header>
