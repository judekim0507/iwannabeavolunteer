<script lang="ts">
	import { dashboard } from '$lib/stores/dashboard.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	const stats = $derived(dashboard.stats);
</script>

<div class="stats-grid" class:four={auth.isSuperuser}>
	<div class="stat-card" style="animation-delay: 0ms">
		<span class="stat-label">Active</span>
		<span class="stat-value">{stats.activeEvents}</span>
	</div>

	<div class="stat-card" style="animation-delay: 40ms">
		<span class="stat-label">Events</span>
		<span class="stat-value">{stats.totalEvents}</span>
	</div>

	<div class="stat-card" style="animation-delay: 80ms">
		<span class="stat-label">Volunteers</span>
		<span class="stat-value">{stats.volunteers}</span>
	</div>

	{#if auth.isSuperuser}
		<div class="stat-card" style="animation-delay: 120ms">
			<span class="stat-label">Councils</span>
			<span class="stat-value">{stats.councils}</span>
		</div>
	{/if}
</div>

<style>
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}

	.stats-grid.four {
		grid-template-columns: repeat(2, 1fr);
	}

	@media (min-width: 640px) {
		.stats-grid.four {
			grid-template-columns: repeat(4, 1fr);
		}

		.stats-grid {
			gap: 10px;
		}
	}

	.stat-card {
		background: white;
		border: 1.5px solid #ededeb;
		border-radius: 12px;
		padding: 14px 16px;
		transition: border-color 0.2s ease;
		animation: statIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.stat-card:hover {
		border-color: #d5d5d2;
	}

	.stat-label {
		display: block;
		font-family: 'DM Mono', monospace;
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.6px;
		text-transform: uppercase;
		color: #8a8a87;
	}

	.stat-value {
		display: block;
		font-family: 'DM Sans', sans-serif;
		font-size: 28px;
		font-weight: 600;
		letter-spacing: -1px;
		color: #141413;
		margin-top: 4px;
		line-height: 1;
	}

	@media (max-width: 639px) {
		.stat-value {
			font-size: 24px;
		}

		.stat-card {
			padding: 12px 14px;
		}
	}

	@keyframes statIn {
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
