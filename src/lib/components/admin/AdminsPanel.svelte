<script lang="ts">
	import { dashboard } from '$lib/stores/dashboard.svelte';

	let email = $state('');
	let password = $state('');
	let councilId = $state('');
	let isCreating = $state(false);
	let deletingId = $state<string | null>(null);
	let isOpen = $state(false);

	async function handleCreate() {
		if (!email.trim() || !password.trim() || !councilId) return;
		isCreating = true;
		try {
			await dashboard.createAdmin(email, password, councilId);
			email = '';
			password = '';
			councilId = '';
			isOpen = false;
		} catch (err) {
			dashboard.error = err instanceof Error ? err.message : 'Failed to create';
		} finally {
			isCreating = false;
		}
	}

	async function handleDelete(adminId: string, userId: string) {
		if (!confirm('Remove this admin?')) return;
		deletingId = adminId;
		try {
			await dashboard.deleteAdmin(adminId, userId);
		} catch (err) {
			dashboard.error = err instanceof Error ? err.message : 'Failed to delete';
		} finally {
			deletingId = null;
		}
	}

	function close() {
		isOpen = false;
		email = '';
		password = '';
		councilId = '';
	}
</script>

<div class="panel">
	<div class="panel-header">
		<h3>Admins</h3>
		<button onclick={() => (isOpen ? close() : (isOpen = true))} class="toggle-btn">
			{isOpen ? 'Cancel' : '+ Add'}
		</button>
	</div>

	{#if isOpen}
		<form onsubmit={(e) => { e.preventDefault(); handleCreate(); }} class="panel-form">
			<div class="form-fields">
				<input
					type="email"
					placeholder="Email"
					bind:value={email}
					disabled={isCreating}
				/>
				<input
					type="password"
					placeholder="Password"
					bind:value={password}
					disabled={isCreating}
				/>
				<div class="select-wrap">
					<select bind:value={councilId} disabled={isCreating}>
						<option value="">Select council</option>
						{#each dashboard.councils as council (council.id)}
							<option value={council.id}>{council.name}</option>
						{/each}
					</select>
					<svg class="select-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
						<path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</div>
			</div>
			<div class="form-actions">
				<button type="submit" disabled={isCreating || !email.trim() || !password.trim() || !councilId} class="add-btn">
					{#if isCreating}
						<span class="spinner"></span>
						Creating
					{:else}
						Create
					{/if}
				</button>
				<button type="button" onclick={close} class="cancel-btn">Cancel</button>
			</div>
		</form>
	{/if}

	<div class="panel-list">
		{#if dashboard.admins.length === 0}
			<p class="empty">No admins yet</p>
		{:else}
			{#each dashboard.admins as admin (admin.id)}
				<div class="list-item" class:deleting={deletingId === admin.id}>
					<div class="admin-info">
						<span class="admin-email">{admin.email}</span>
						<span class="admin-role">
							{admin.role === 'superuser' ? 'Superuser' : dashboard.getCouncilName(admin.council_id)}
						</span>
					</div>
					{#if admin.role !== 'superuser'}
						<button
							onclick={() => handleDelete(admin.id, admin.user_id)}
							disabled={deletingId === admin.id}
							class="delete-btn"
							aria-label="Remove admin"
						>
							{#if deletingId === admin.id}
								<span class="spinner-sm"></span>
							{:else}
								<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
									<path d="M2 4h10M5 4V2.5a1 1 0 011-1h2a1 1 0 011 1V4M11 4v7.5a1.5 1.5 0 01-1.5 1.5h-5A1.5 1.5 0 013 11.5V4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
							{/if}
						</button>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.panel {
		background: white;
		border: 1.5px solid #ededeb;
		border-radius: 14px;
		overflow: hidden;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		border-bottom: 1.5px solid #ededeb;
	}

	.panel-header h3 {
		font-family: 'DM Sans', sans-serif;
		font-size: 14px;
		font-weight: 600;
		color: #141413;
		letter-spacing: -0.2px;
	}

	.toggle-btn {
		border: none;
		background: transparent;
		font-family: 'DM Sans', sans-serif;
		font-size: 12px;
		font-weight: 500;
		color: #5a5a57;
		padding: 4px 10px;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.toggle-btn:hover {
		background: #f0f0ed;
		color: #141413;
	}

	.panel-form {
		padding: 12px 16px;
		border-bottom: 1.5px solid #ededeb;
		animation: fadeIn 0.15s ease-out;
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.form-fields input,
	.select-wrap select {
		width: 100%;
		height: 36px;
		padding: 0 12px;
		border: 1.5px solid #e2e2df;
		border-radius: 8px;
		background: white;
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		color: #141413;
		outline: none;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
		-webkit-appearance: none;
	}

	.form-fields input::placeholder {
		color: #b5b5b2;
	}

	.form-fields input:focus,
	.select-wrap select:focus {
		border-color: #141413;
		box-shadow: 0 0 0 3px rgba(20, 20, 19, 0.06);
	}

	.form-fields input:disabled,
	.select-wrap select:disabled {
		background: #fafaf9;
	}

	.select-wrap {
		position: relative;
	}

	.select-wrap select {
		appearance: none;
		padding-right: 28px;
		cursor: pointer;
	}

	.select-icon {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: #8a8a87;
	}

	.form-actions {
		display: flex;
		gap: 8px;
		margin-top: 10px;
	}

	.add-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 36px;
		padding: 0 14px;
		border: none;
		border-radius: 8px;
		background: #141413;
		color: white;
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s ease, transform 0.1s ease;
	}

	.add-btn:hover:not(:disabled) {
		background: #2a2a28;
	}

	.add-btn:active:not(:disabled) {
		transform: scale(0.97);
	}

	.add-btn:disabled {
		background: #e2e2df;
		color: #b5b5b2;
		cursor: not-allowed;
	}

	.cancel-btn {
		height: 36px;
		padding: 0 14px;
		border: 1.5px solid #e2e2df;
		border-radius: 8px;
		background: transparent;
		color: #5a5a57;
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.cancel-btn:hover {
		border-color: #c8c8c5;
		color: #141413;
	}

	.panel-list {
		max-height: 240px;
		overflow-y: auto;
	}

	.empty {
		padding: 24px 16px;
		text-align: center;
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		color: #8a8a87;
	}

	.list-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 10px 16px;
		border-bottom: 1px solid #f0f0ed;
		transition: background 0.1s ease, opacity 0.2s ease;
	}

	.list-item:last-child {
		border-bottom: none;
	}

	.list-item:hover {
		background: #fafaf9;
	}

	.list-item.deleting {
		opacity: 0.5;
	}

	.admin-info {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		flex-wrap: wrap;
	}

	.admin-email {
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		font-weight: 500;
		color: #141413;
	}

	.admin-role {
		font-family: 'DM Mono', monospace;
		font-size: 11px;
		color: #8a8a87;
	}

	.delete-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: 7px;
		background: transparent;
		color: #b5b5b2;
		cursor: pointer;
		transition: all 0.15s ease;
		opacity: 0;
		flex-shrink: 0;
	}

	.list-item:hover .delete-btn {
		opacity: 1;
	}

	.delete-btn:hover:not(:disabled) {
		background: #fef2f2;
		color: #dc2626;
	}

	@media (hover: none) {
		.delete-btn {
			opacity: 1;
		}
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.25);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	.spinner-sm {
		width: 12px;
		height: 12px;
		border: 1.5px solid #e2e2df;
		border-top-color: #8a8a87;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
