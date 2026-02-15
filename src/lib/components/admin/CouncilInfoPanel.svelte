<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { dashboard } from '$lib/stores/dashboard.svelte';
</script>

<div class="info-panel">
	<h3>Your Council</h3>
	{#if auth.userCouncil}
		<p class="council-name">{auth.userCouncil.name}</p>
		<div class="council-stats">
			<span>{dashboard.events.length} event{dashboard.events.length !== 1 ? 's' : ''}</span>
			<span class="dot"></span>
			<span>{dashboard.volunteers.length} volunteer{dashboard.volunteers.length !== 1 ? 's' : ''}</span>
		</div>
	{:else}
		<p class="empty">Not assigned to a council yet.</p>
	{/if}
</div>

<style>
	.info-panel {
		background: white;
		border: 1.5px solid #ededeb;
		border-radius: 14px;
		padding: 18px;
	}

	h3 {
		font-family: 'DM Mono', monospace;
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		color: #8a8a87;
		margin-bottom: 10px;
	}

	.council-name {
		font-family: 'DM Sans', sans-serif;
		font-size: 16px;
		font-weight: 600;
		color: #141413;
		letter-spacing: -0.3px;
	}

	.council-stats {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 6px;
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		color: #8a8a87;
	}

	.dot {
		width: 3px;
		height: 3px;
		border-radius: 50%;
		background: #d5d5d2;
	}

	.empty {
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		color: #8a8a87;
	}
</style>
