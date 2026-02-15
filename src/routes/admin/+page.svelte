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
		if (auth.isAuthenticated && !dashboard.isLoading && !dashboard.hasLoaded) {
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
	<div class="loading-screen">
		<div class="loading-inner">
			<span class="loading-spinner"></span>
			<span class="loading-text">Loading</span>
		</div>
	</div>
{:else if !auth.isAuthenticated}
	<LoginForm />
{:else}
	<div class="dashboard">
		<div class="dashboard-container">
			<DashboardHeader />

			<!-- Toast messages -->
			{#if dashboard.error}
				<div class="toast toast-error" role="alert">
					<div class="toast-content">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
							<path d="M8 4.5v4M8 10.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
						</svg>
						<p>{dashboard.error}</p>
					</div>
					<button onclick={() => (dashboard.error = null)} class="toast-dismiss" aria-label="Dismiss">
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
							<path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
						</svg>
					</button>
				</div>
			{/if}

			{#if dashboard.successMessage}
				<div class="toast toast-success" role="status">
					<div class="toast-content">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
							<path d="M5.5 8.5L7 10l3.5-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
						<p>{dashboard.successMessage}</p>
					</div>
				</div>
			{/if}

			{#if dashboard.isLoading}
				<DashboardSkeleton />
			{:else}
				<StatsGrid />

				<CreateEventForm />

				<!-- Events -->
				<section class="events-section">
					<div class="section-header">
						<h2>Events</h2>
						<span class="count">{filteredEvents.length}</span>
					</div>

					{#if filteredEvents.length === 0}
						<div class="empty-state">
							<p class="empty-title">No events yet</p>
							<p class="empty-sub">Create one to get started</p>
						</div>
					{:else}
						<div class="events-list">
							{#each filteredEvents as event, i (event.id)}
								<div style="animation: cardIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) {i * 40}ms both">
									<EventCard {event} volunteers={dashboard.getVolunteersForEvent(event.id)} />
								</div>
							{/each}
						</div>
					{/if}
				</section>

				<!-- Management -->
				{#if auth.isSuperuser}
					<section class="management-section">
						<div class="management-grid">
							<CouncilsPanel />
							<AdminsPanel />
						</div>
					</section>
				{:else}
					<section class="management-section">
						<CouncilInfoPanel />
					</section>
				{/if}
			{/if}

			<footer class="dash-footer">
				<span>v{APP_VERSION}</span>
			</footer>
		</div>
	</div>
{/if}

<style>
	.loading-screen {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100dvh;
		min-height: 100vh;
		background: #f7f7f5;
	}

	.loading-inner {
		display: flex;
		align-items: center;
		gap: 10px;
		animation: fadeIn 0.3s ease-out;
	}

	.loading-spinner {
		width: 18px;
		height: 18px;
		border: 2px solid #e2e2df;
		border-top-color: #141413;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	.loading-text {
		font-family: 'DM Sans', sans-serif;
		font-size: 14px;
		color: #8a8a87;
		letter-spacing: -0.1px;
	}

	.dashboard {
		min-height: 100dvh;
		min-height: 100vh;
		background: #f7f7f5;
	}

	.dashboard-container {
		max-width: 840px;
		margin: 0 auto;
		padding: 0 16px 48px;
	}

	@media (min-width: 640px) {
		.dashboard-container {
			padding: 0 24px 48px;
		}
	}

	/* Toasts */
	.toast {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 14px;
		border-radius: 12px;
		margin-bottom: 16px;
		animation: toastIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.toast-content {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		min-width: 0;
	}

	.toast-content svg {
		flex-shrink: 0;
		margin-top: 1px;
	}

	.toast-content p {
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		line-height: 1.45;
		letter-spacing: -0.1px;
	}

	.toast-error {
		background: #fef2f2;
		color: #c53030;
	}

	.toast-success {
		background: #f0fdf4;
		color: #15803d;
	}

	.toast-dismiss {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: inherit;
		opacity: 0.5;
		cursor: pointer;
		transition: opacity 0.15s ease, background 0.15s ease;
	}

	.toast-dismiss:hover {
		opacity: 1;
		background: rgba(0, 0, 0, 0.05);
	}

	/* Events section */
	.events-section {
		margin-bottom: 32px;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 12px;
	}

	.section-header h2 {
		font-family: 'DM Sans', sans-serif;
		font-size: 15px;
		font-weight: 600;
		color: #141413;
		letter-spacing: -0.2px;
	}

	.count {
		font-family: 'DM Mono', monospace;
		font-size: 11px;
		font-weight: 500;
		color: #8a8a87;
		background: #ededeb;
		padding: 2px 7px;
		border-radius: 5px;
	}

	.empty-state {
		border: 1.5px dashed #d5d5d2;
		border-radius: 14px;
		padding: 40px 24px;
		text-align: center;
	}

	.empty-title {
		font-family: 'DM Sans', sans-serif;
		font-size: 14px;
		font-weight: 500;
		color: #5a5a57;
	}

	.empty-sub {
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		color: #b5b5b2;
		margin-top: 4px;
	}

	.events-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	/* Management */
	.management-section {
		margin-bottom: 16px;
	}

	.management-grid {
		display: grid;
		gap: 12px;
	}

	@media (min-width: 768px) {
		.management-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	/* Footer */
	.dash-footer {
		text-align: center;
		padding-top: 24px;
	}

	.dash-footer span {
		font-family: 'DM Mono', monospace;
		font-size: 11px;
		color: #c8c8c5;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	@keyframes toastIn {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes cardIn {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
