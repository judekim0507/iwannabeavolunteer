<script lang="ts">
	import { dashboard } from '$lib/stores/dashboard.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	let name = $state('');
	let emoji = $state('');
	let endsAt = $state('');
	let councilId = $state('');
	let isCreating = $state(false);
	let isOpen = $state(false);

	$effect(() => {
		if (!auth.isSuperuser && auth.userCouncil) {
			councilId = auth.userCouncil.id;
		} else if (auth.isSuperuser && dashboard.councils.length > 0 && !councilId) {
			councilId = dashboard.councils[0].id;
		}
	});

	async function handleSubmit() {
		if (!name.trim()) return;

		const targetCouncilId = auth.isSuperuser ? councilId : (auth.userCouncil?.id || auth.adminRole?.council_id);
		if (!targetCouncilId) {
			dashboard.error = 'Please select a council';
			return;
		}

		isCreating = true;
		try {
			await dashboard.createEvent(name, emoji, endsAt || null, targetCouncilId);
			name = '';
			emoji = '';
			endsAt = '';
			isOpen = false;
		} catch (err) {
			dashboard.error = err instanceof Error ? err.message : 'Failed to create event';
		} finally {
			isCreating = false;
		}
	}

	function close() {
		isOpen = false;
		name = '';
		emoji = '';
		endsAt = '';
	}
</script>

<div class="create-event-section">
	{#if !isOpen}
		<button type="button" onclick={() => (isOpen = true)} class="new-event-btn">
			<svg width="15" height="15" viewBox="0 0 15 15" fill="none">
				<path d="M7.5 2.5v10M2.5 7.5h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
			</svg>
			New event
		</button>
	{:else}
		<div class="create-form-card">
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<div class="form-header">
					<h3>Create event</h3>
					<button type="button" onclick={close} class="close-btn" aria-label="Close">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
						</svg>
					</button>
				</div>

				<div class="form-fields">
					{#if auth.isSuperuser}
						<div class="field">
							<label for="create-council">Council</label>
							<div class="select-wrap">
								<select id="create-council" bind:value={councilId} disabled={isCreating}>
									{#each dashboard.councils as council (council.id)}
										<option value={council.id}>{council.name}</option>
									{/each}
								</select>
								<svg class="select-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
									<path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
							</div>
						</div>
					{/if}

					<div class="field">
						<label for="create-name">Event name</label>
						<input
							id="create-name"
							type="text"
							placeholder="e.g. Bubble Tea Fundraiser"
							bind:value={name}
							disabled={isCreating}
						/>
					</div>

					<div class="field-row">
						<div class="field">
							<label for="create-emoji">Emoji</label>
							<input
								id="create-emoji"
								type="text"
								maxlength="4"
								placeholder="🎉"
								bind:value={emoji}
								disabled={isCreating}
								class="emoji-input"
							/>
						</div>
						<div class="field flex-1">
							<label for="create-ends">End date</label>
							<input
								id="create-ends"
								type="datetime-local"
								bind:value={endsAt}
								disabled={isCreating}
							/>
						</div>
					</div>
				</div>

				<div class="form-actions">
					<button
						type="submit"
						disabled={isCreating || !name.trim() || (auth.isSuperuser && !councilId)}
						class="primary-btn"
					>
						{#if isCreating}
							<span class="spinner"></span>
							Creating
						{:else}
							Create event
						{/if}
					</button>
					<button type="button" onclick={close} class="ghost-btn">
						Cancel
					</button>
				</div>
			</form>
		</div>
	{/if}
</div>

<style>
	.create-event-section {
		margin: 28px 0 24px;
	}

	.new-event-btn {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		height: 40px;
		padding: 0 16px;
		border: none;
		border-radius: 10px;
		background: #141413;
		color: white;
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		font-weight: 500;
		letter-spacing: -0.1px;
		cursor: pointer;
		transition: background 0.2s ease, transform 0.1s ease;
	}

	.new-event-btn:hover {
		background: #2a2a28;
	}

	.new-event-btn:active {
		transform: scale(0.97);
	}

	.create-form-card {
		background: white;
		border: 1.5px solid #ededeb;
		border-radius: 14px;
		overflow: hidden;
		animation: formIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.create-form-card form {
		padding: 18px;
	}

	@media (min-width: 640px) {
		.create-form-card form {
			padding: 22px;
		}
	}

	.form-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 18px;
	}

	.form-header h3 {
		font-family: 'DM Sans', sans-serif;
		font-size: 15px;
		font-weight: 600;
		color: #141413;
		letter-spacing: -0.2px;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: 7px;
		background: transparent;
		color: #8a8a87;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.close-btn:hover {
		background: #f0f0ed;
		color: #5a5a57;
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.field-row {
		display: flex;
		gap: 10px;
	}

	.field {
		flex: 1;
	}

	.flex-1 {
		flex: 2;
	}

	.field label {
		display: block;
		font-family: 'DM Sans', sans-serif;
		font-size: 12px;
		font-weight: 500;
		color: #8a8a87;
		margin-bottom: 6px;
		letter-spacing: -0.1px;
	}

	.field input,
	.field .select-wrap select {
		width: 100%;
		height: 40px;
		padding: 0 12px;
		border: 1.5px solid #e2e2df;
		border-radius: 9px;
		background: white;
		font-family: 'DM Sans', sans-serif;
		font-size: 14px;
		color: #141413;
		outline: none;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
		-webkit-appearance: none;
	}

	.field input::placeholder {
		color: #b5b5b2;
	}

	.field input:hover:not(:disabled),
	.field .select-wrap select:hover:not(:disabled) {
		border-color: #c8c8c5;
	}

	.field input:focus,
	.field .select-wrap select:focus {
		border-color: #141413;
		box-shadow: 0 0 0 3px rgba(20, 20, 19, 0.06);
	}

	.field input:disabled,
	.field .select-wrap select:disabled {
		background: #fafaf9;
		color: #b5b5b2;
	}

	.emoji-input {
		text-align: center;
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
		margin-top: 18px;
	}

	.primary-btn {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		height: 40px;
		padding: 0 16px;
		border: none;
		border-radius: 9px;
		background: #141413;
		color: white;
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s ease, transform 0.1s ease;
	}

	.primary-btn:hover:not(:disabled) {
		background: #2a2a28;
	}

	.primary-btn:active:not(:disabled) {
		transform: scale(0.97);
	}

	.primary-btn:disabled {
		background: #e2e2df;
		color: #b5b5b2;
		cursor: not-allowed;
	}

	.ghost-btn {
		height: 40px;
		padding: 0 14px;
		border: 1.5px solid #e2e2df;
		border-radius: 9px;
		background: transparent;
		color: #5a5a57;
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.ghost-btn:hover {
		border-color: #c8c8c5;
		color: #141413;
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.25);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes formIn {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
