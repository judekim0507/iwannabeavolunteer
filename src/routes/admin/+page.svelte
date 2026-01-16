<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { dashboard } from '$lib/stores/dashboard.svelte';
	import { APP_VERSION } from '$lib/appVersion';

	import LoginForm from '$lib/components/admin/LoginForm.svelte';
	import DashboardHeader from '$lib/components/admin/DashboardHeader.svelte';
	import DashboardSkeleton from '$lib/components/admin/DashboardSkeleton.svelte';
	import StatsGrid from '$lib/components/admin/StatsGrid.svelte';
	import CreateEventForm from '$lib/components/admin/CreateEventForm.svelte';
	import EventCard from '$lib/components/admin/EventCard.svelte';
	import CouncilsPanel from '$lib/components/admin/CouncilsPanel.svelte';
	import AdminsPanel from '$lib/components/admin/AdminsPanel.svelte';
	import CouncilInfoPanel from '$lib/components/admin/CouncilInfoPanel.svelte';

	onMount(() => {
		auth.initialize();
		return () => auth.destroy();
	});

	$effect(() => {
		if (auth.isAuthenticated && !dashboard.isLoading && dashboard.events.length === 0) {
			dashboard.loadAll();
		}
	});

	$effect(() => {
		if (!auth.isAuthenticated) dashboard.reset();
	});

	const filteredEvents = $derived(dashboard.filteredEvents);
</script>

<svelte:head>
	<title>Admin</title>
</svelte:head>

{#if !auth.isInitialized || auth.isLoading}
	<div class="flex min-h-screen items-center justify-center bg-[#fafafa]">
		<div class="flex items-center gap-3">
			<span class="h-5 w-5 animate-spin rounded-full border-2 border-[#e5e5e5] border-t-[#1a1a1a]"></span>
			<span class="text-[14px] text-[#666]">Loading</span>
		</div>
	</div>
{:else if !auth.isAuthenticated}
	<LoginForm />
{:else}
	<div class="min-h-screen bg-[#fafafa]">
		<div class="mx-auto max-w-5xl px-6 pb-12">
			<DashboardHeader />

			<!-- Messages -->
			{#if dashboard.error}
				<div class="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 transition-all duration-300" style="animation: fadeIn 0.2s ease-out">
					<div class="flex items-start justify-between gap-4">
						<p class="text-[13px] text-red-600">{dashboard.error}</p>
						<button
							onclick={() => (dashboard.error = null)}
							class="shrink-0 rounded-md p-1 text-red-400 transition-colors duration-200 hover:bg-red-100 hover:text-red-600"
						>
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				</div>
			{/if}

			{#if dashboard.successMessage}
				<div class="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 transition-all duration-300" style="animation: fadeIn 0.2s ease-out">
					<p class="text-[13px] text-emerald-700">{dashboard.successMessage}</p>
				</div>
			{/if}

			{#if dashboard.isLoading}
				<DashboardSkeleton />
			{:else}
				<!-- Stats -->
				<StatsGrid />

				<!-- Create Event -->
				<CreateEventForm />

				<!-- Events Section -->
				<section class="mb-10">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-[15px] font-semibold text-[#1a1a1a]">Events</h2>
						<span class="text-[12px] text-[#888]">{filteredEvents.length} total</span>
					</div>

					{#if filteredEvents.length === 0}
						<div class="rounded-xl border border-dashed border-[#d4d4d4] bg-white px-6 py-12 text-center">
							<p class="text-[14px] text-[#888]">No events yet</p>
							<p class="mt-1 text-[13px] text-[#bbb]">Click "New event" to create one</p>
						</div>
					{:else}
						<div class="space-y-4">
							{#each filteredEvents as event (event.id)}
								<EventCard {event} volunteers={dashboard.getVolunteersForEvent(event.id)} />
							{/each}
						</div>
					{/if}
				</section>

				<!-- Management Section -->
				{#if auth.isSuperuser}
					<section class="grid gap-6 lg:grid-cols-2">
						<CouncilsPanel />
						<AdminsPanel />
					</section>
				{:else}
					<CouncilInfoPanel />
				{/if}
			{/if}

			<!-- Footer -->
			<footer class="mt-12 pt-6 text-center">
				<p class="text-[11px] text-[#bbb]">v{APP_VERSION}</p>
			</footer>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		background-color: #fafafa;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(-4px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
