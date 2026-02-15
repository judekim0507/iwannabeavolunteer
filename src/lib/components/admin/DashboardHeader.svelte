<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { dashboard } from '$lib/stores/dashboard.svelte';

	let isSigningOut = $state(false);

	async function handleLogout() {
		isSigningOut = true;
		await auth.signOut();
		dashboard.reset();
	}
</script>

<header class="dash-header">
	<div class="header-top">
		<div class="title-group">
			<h1>{auth.isSuperuser ? 'Dashboard' : auth.userCouncil?.name ?? 'Dashboard'}</h1>
			{#if auth.isSuperuser}
				<span class="badge">Superuser</span>
			{/if}
		</div>

		<button
			type="button"
			onclick={handleLogout}
			disabled={isSigningOut}
			class="sign-out-btn"
		>
			{#if isSigningOut}
				<span class="btn-spinner"></span>
			{:else}
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path d="M6 2H4a2 2 0 00-2 2v8a2 2 0 002 2h2M10.5 11.5L14 8l-3.5-3.5M14 8H6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			{/if}
		</button>
	</div>

	<div class="header-meta">
		<span class="user-email">{auth.user?.email}</span>

		{#if auth.isSuperuser && dashboard.councils.length > 0}
			<div class="filter-wrap">
				<select bind:value={dashboard.councilFilter}>
					<option value={null}>All councils</option>
					{#each dashboard.councils as council (council.id)}
						<option value={council.id}>{council.name}</option>
					{/each}
				</select>
				<svg class="select-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
					<path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</div>
		{/if}
	</div>
</header>

<style>
	.dash-header {
		padding: 20px 0 16px;
	}

	.header-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.title-group {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.title-group h1 {
		font-family: 'DM Sans', sans-serif;
		font-size: 22px;
		font-weight: 600;
		letter-spacing: -0.5px;
		color: #141413;
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.badge {
		flex-shrink: 0;
		font-family: 'DM Mono', monospace;
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		color: #8a8a87;
		background: #ededeb;
		padding: 4px 8px;
		border-radius: 6px;
	}

	.sign-out-btn {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border: 1.5px solid #e2e2df;
		border-radius: 9px;
		background: white;
		color: #8a8a87;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.sign-out-btn:hover:not(:disabled) {
		border-color: #c8c8c5;
		color: #141413;
		background: #fafaf9;
	}

	.sign-out-btn:active:not(:disabled) {
		transform: scale(0.95);
	}

	.btn-spinner {
		width: 14px;
		height: 14px;
		border: 1.5px solid #e2e2df;
		border-top-color: #8a8a87;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	.header-meta {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 8px;
		flex-wrap: wrap;
	}

	.user-email {
		font-family: 'DM Mono', monospace;
		font-size: 12px;
		color: #8a8a87;
		letter-spacing: -0.2px;
	}

	.filter-wrap {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.filter-wrap select {
		appearance: none;
		-webkit-appearance: none;
		font-family: 'DM Sans', sans-serif;
		font-size: 12px;
		font-weight: 500;
		color: #5a5a57;
		background: #ededeb;
		border: none;
		border-radius: 6px;
		padding: 5px 24px 5px 10px;
		cursor: pointer;
		outline: none;
		transition: background 0.15s ease;
	}

	.filter-wrap select:hover {
		background: #e2e2df;
	}

	.filter-wrap select:focus {
		background: #e2e2df;
	}

	.select-chevron {
		position: absolute;
		right: 7px;
		pointer-events: none;
		color: #8a8a87;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
