<script lang="ts">
	import type { Event, Volunteer } from '$lib/supabase';
	import { dashboard } from '$lib/stores/dashboard.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	type Props = {
		event: Event;
		volunteers: Volunteer[];
	};

	let { event, volunteers }: Props = $props();

	let isExpanded = $state(false);
	let isEditing = $state(false);
	let isDeleting = $state(false);
	let isCreatingWheel = $state(false);
	let copySuccess = $state(false);
	let showActions = $state(false);

	let editName = $state(event.name);
	let editEmoji = $state(event.emoji || '');
	let editEndsAt = $state('');

	$effect(() => {
		if (event.ends_at) {
			const date = new Date(event.ends_at);
			editEndsAt = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
		} else {
			editEndsAt = '';
		}
	});

	async function saveEdits() {
		if (!editName.trim()) return;
		try {
			await dashboard.updateEvent(event.id, {
				name: editName,
				emoji: editEmoji,
				ends_at: editEndsAt || null,
			});
			isEditing = false;
		} catch (err) {
			dashboard.error = err instanceof Error ? err.message : 'Failed to update';
		}
	}

	async function handleToggleActive() {
		try {
			await dashboard.toggleEventActive(event.id);
		} catch (err) {
			dashboard.error = err instanceof Error ? err.message : 'Failed to toggle';
		}
	}

	async function handleDelete() {
		if (!confirm('Delete this event and all its volunteers?')) return;
		isDeleting = true;
		showActions = false;
		try {
			await dashboard.deleteEvent(event.id);
		} catch (err) {
			dashboard.error = err instanceof Error ? err.message : 'Failed to delete';
		} finally {
			isDeleting = false;
		}
	}

	async function copyNames() {
		const names = volunteers.map((v) => v.full_name).join('\n');
		if (!names) return;
		try {
			await navigator.clipboard.writeText(names);
			copySuccess = true;
			showActions = false;
			setTimeout(() => (copySuccess = false), 2000);
		} catch {
			dashboard.error = 'Failed to copy';
		}
	}

	async function createWheel() {
		isCreatingWheel = true;
		showActions = false;
		try {
			const url = await dashboard.createWheelForEvent(event);
			if (url) window.open(url, '_blank', 'noopener,noreferrer');
		} catch (err) {
			dashboard.error = err instanceof Error ? err.message : 'Failed to create wheel';
		} finally {
			isCreatingWheel = false;
		}
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.actions-menu') && !target.closest('.more-btn')) {
			showActions = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="event-card" class:expanded={isExpanded} class:deleting={isDeleting}>
	{#if isEditing}
		<div class="edit-form">
			<div class="edit-header">
				<h3>Edit event</h3>
				<button onclick={() => (isEditing = false)} class="close-btn" aria-label="Close">
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
					</svg>
				</button>
			</div>

			<div class="edit-fields">
				<input
					type="text"
					bind:value={editName}
					placeholder="Event name"
					class="edit-input"
				/>
				<div class="edit-row">
					<input
						type="text"
						maxlength="4"
						bind:value={editEmoji}
						placeholder="Emoji"
						class="edit-input emoji-input"
					/>
					<input
						type="datetime-local"
						bind:value={editEndsAt}
						class="edit-input date-input"
					/>
				</div>
			</div>

			<div class="edit-actions">
				<button onclick={saveEdits} class="save-btn">Save</button>
				<button onclick={() => (isEditing = false)} class="cancel-btn">Cancel</button>
			</div>
		</div>
	{:else}
		<div class="event-main">
			<div class="event-left">
				<button
					onclick={handleToggleActive}
					class="toggle-switch"
					class:active={event.is_active}
					role="switch"
					aria-checked={event.is_active}
					aria-label={event.is_active ? 'Deactivate event' : 'Activate event'}
				>
					<span class="toggle-thumb"></span>
				</button>

				<div class="event-info">
					<div class="event-title-row">
						{#if event.emoji}<span class="event-emoji">{event.emoji}</span>{/if}
						<span class="event-name">{event.name}</span>
					</div>
					<div class="event-meta">
						{#if auth.isSuperuser}
							<span>{dashboard.getCouncilName(event.council_id)}</span>
						{/if}
						{#if event.ends_at}
							<span>{formatDate(event.ends_at)}</span>
						{/if}
						<span>{volunteers.length} volunteer{volunteers.length !== 1 ? 's' : ''}</span>
					</div>
				</div>
			</div>

			<div class="event-right">
				{#if copySuccess}
					<span class="copy-toast">Copied!</span>
				{/if}

				<!-- Desktop actions -->
				<div class="desktop-actions">
					<button onclick={() => (isExpanded = !isExpanded)} class="action-btn">
						{isExpanded ? 'Hide' : 'View'}
					</button>
					<button onclick={copyNames} disabled={volunteers.length === 0} class="action-btn">
						Copy
					</button>
					<button onclick={createWheel} disabled={isCreatingWheel || volunteers.length === 0} class="action-btn">
						{isCreatingWheel ? '...' : 'Wheel'}
					</button>
					<button onclick={() => { editName = event.name; editEmoji = event.emoji || ''; isEditing = true; }} class="action-btn">
						Edit
					</button>
					<button onclick={handleDelete} disabled={isDeleting} class="action-btn danger">
						{isDeleting ? '...' : 'Delete'}
					</button>
				</div>

				<!-- Mobile actions -->
				<div class="mobile-actions">
					<button onclick={() => (isExpanded = !isExpanded)} class="action-btn">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							{#if isExpanded}
								<path d="M4 10l4-4 4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
							{:else}
								<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
							{/if}
						</svg>
					</button>
					<button onclick={() => (showActions = !showActions)} class="more-btn" aria-label="More actions">
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<circle cx="8" cy="3.5" r="1.2" fill="currentColor"/>
							<circle cx="8" cy="8" r="1.2" fill="currentColor"/>
							<circle cx="8" cy="12.5" r="1.2" fill="currentColor"/>
						</svg>
					</button>

					{#if showActions}
						<div class="actions-menu">
							<button onclick={copyNames} disabled={volunteers.length === 0}>
								<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
									<rect x="4.5" y="4.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
									<path d="M9.5 4.5V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v5A1.5 1.5 0 003 9.5h1.5" stroke="currentColor" stroke-width="1.2"/>
								</svg>
								Copy names
							</button>
							<button onclick={createWheel} disabled={isCreatingWheel || volunteers.length === 0}>
								<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
									<circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/>
									<circle cx="7" cy="7" r="1" fill="currentColor"/>
									<path d="M7 1.5V7M7 7l3.9 3.9M7 7l-3.9 3.9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
								</svg>
								{isCreatingWheel ? 'Creating...' : 'Random wheel'}
							</button>
							<button onclick={() => { editName = event.name; editEmoji = event.emoji || ''; isEditing = true; showActions = false; }}>
								<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
									<path d="M8.5 2.5l3 3-7.5 7.5H1v-3l7.5-7.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
								</svg>
								Edit event
							</button>
							<div class="menu-divider"></div>
							<button onclick={handleDelete} disabled={isDeleting} class="danger-item">
								<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
									<path d="M2 4h10M5 4V2.5a1 1 0 011-1h2a1 1 0 011 1V4M11 4v7.5a1.5 1.5 0 01-1.5 1.5h-5A1.5 1.5 0 013 11.5V4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								{isDeleting ? 'Deleting...' : 'Delete event'}
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>

		{#if isExpanded}
			<div class="volunteer-list">
				{#if volunteers.length === 0}
					<p class="empty-text">No volunteers yet</p>
				{:else}
					<div class="vol-table-wrap">
						<table>
							<thead>
								<tr>
									<th>Name</th>
									<th>Status</th>
									<th class="text-right">Submitted</th>
								</tr>
							</thead>
							<tbody>
								{#each volunteers as v, i (v.id)}
									<tr style="animation: rowIn 0.2s ease-out {i * 25}ms both">
										<td class="vol-name">{v.full_name}</td>
										<td>
											<span class="status-tag" class:first-time={!v.has_volunteered_before}>
												{v.has_volunteered_before ? 'Returning' : 'First time'}
											</span>
										</td>
										<td class="vol-date">{formatDate(v.created_at)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.event-card {
		background: white;
		border: 1.5px solid #ededeb;
		border-radius: 14px;
		overflow: hidden;
		transition: border-color 0.2s ease, opacity 0.3s ease;
	}

	.event-card:hover {
		border-color: #d5d5d2;
	}

	.event-card.deleting {
		opacity: 0.5;
		pointer-events: none;
	}

	/* Main row */
	.event-main {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
		padding: 14px 14px;
	}

	@media (min-width: 640px) {
		.event-main {
			padding: 16px 18px;
			align-items: center;
		}
	}

	.event-left {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		min-width: 0;
		flex: 1;
	}

	@media (min-width: 640px) {
		.event-left {
			align-items: center;
		}
	}

	.toggle-switch {
		flex-shrink: 0;
		position: relative;
		width: 34px;
		height: 20px;
		border: none;
		border-radius: 10px;
		background: #d5d5d2;
		cursor: pointer;
		transition: background 0.25s ease;
		margin-top: 1px;
		padding: 0;
	}

	.toggle-switch:hover {
		background: #c8c8c5;
	}

	.toggle-switch.active {
		background: #141413;
	}

	.toggle-switch.active:hover {
		background: #2a2a28;
	}

	.toggle-thumb {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: white;
		transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.toggle-switch.active .toggle-thumb {
		transform: translateX(14px);
	}

	.event-info {
		min-width: 0;
	}

	.event-title-row {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.event-emoji {
		font-size: 15px;
		line-height: 1;
	}

	.event-name {
		font-family: 'DM Sans', sans-serif;
		font-size: 14px;
		font-weight: 600;
		color: #141413;
		letter-spacing: -0.2px;
		line-height: 1.3;
	}

	.event-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 10px;
		margin-top: 4px;
		font-family: 'DM Sans', sans-serif;
		font-size: 12px;
		color: #8a8a87;
		letter-spacing: -0.1px;
	}

	/* Actions */
	.event-right {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
		position: relative;
	}

	.copy-toast {
		position: absolute;
		right: 100%;
		margin-right: 8px;
		white-space: nowrap;
		font-family: 'DM Sans', sans-serif;
		font-size: 12px;
		font-weight: 500;
		color: #22c55e;
		animation: toastIn 0.2s ease-out;
	}

	.desktop-actions {
		display: none;
		gap: 2px;
	}

	.mobile-actions {
		display: flex;
		align-items: center;
		gap: 2px;
		position: relative;
	}

	@media (min-width: 768px) {
		.desktop-actions {
			display: flex;
		}
		.mobile-actions {
			display: none;
		}
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 30px;
		padding: 0 10px;
		border: none;
		border-radius: 7px;
		background: transparent;
		font-family: 'DM Sans', sans-serif;
		font-size: 12px;
		font-weight: 500;
		color: #5a5a57;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.action-btn:hover:not(:disabled) {
		background: #f0f0ed;
		color: #141413;
	}

	.action-btn:active:not(:disabled) {
		transform: scale(0.96);
	}

	.action-btn:disabled {
		color: #c8c8c5;
		cursor: not-allowed;
	}

	.action-btn.danger {
		color: #dc2626;
	}

	.action-btn.danger:hover:not(:disabled) {
		background: #fef2f2;
		color: #b91c1c;
	}

	.more-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border: none;
		border-radius: 7px;
		background: transparent;
		color: #8a8a87;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.more-btn:hover {
		background: #f0f0ed;
		color: #5a5a57;
	}

	/* Actions dropdown */
	.actions-menu {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 4px;
		min-width: 180px;
		background: white;
		border: 1.5px solid #ededeb;
		border-radius: 12px;
		padding: 6px;
		box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
		z-index: 50;
		animation: menuIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.actions-menu button {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 9px 10px;
		border: none;
		border-radius: 8px;
		background: transparent;
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		color: #3a3a38;
		cursor: pointer;
		transition: background 0.1s ease;
		text-align: left;
	}

	.actions-menu button:hover:not(:disabled) {
		background: #f5f5f3;
	}

	.actions-menu button:disabled {
		color: #c8c8c5;
		cursor: not-allowed;
	}

	.actions-menu button svg {
		flex-shrink: 0;
		color: #8a8a87;
	}

	.menu-divider {
		height: 1px;
		background: #ededeb;
		margin: 4px 6px;
	}

	.danger-item {
		color: #dc2626 !important;
	}

	.danger-item svg {
		color: #dc2626 !important;
	}

	.danger-item:hover:not(:disabled) {
		background: #fef2f2 !important;
	}

	/* Edit form */
	.edit-form {
		padding: 16px;
		animation: fadeIn 0.15s ease-out;
	}

	@media (min-width: 640px) {
		.edit-form {
			padding: 18px;
		}
	}

	.edit-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 14px;
	}

	.edit-header h3 {
		font-family: 'DM Sans', sans-serif;
		font-size: 14px;
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

	.edit-fields {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.edit-row {
		display: flex;
		gap: 8px;
	}

	.edit-input {
		width: 100%;
		height: 38px;
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

	.edit-input::placeholder {
		color: #b5b5b2;
	}

	.edit-input:hover {
		border-color: #c8c8c5;
	}

	.edit-input:focus {
		border-color: #141413;
		box-shadow: 0 0 0 3px rgba(20, 20, 19, 0.06);
	}

	.emoji-input {
		max-width: 70px;
		text-align: center;
		flex-shrink: 0;
	}

	.date-input {
		flex: 1;
		min-width: 0;
	}

	.edit-actions {
		display: flex;
		gap: 6px;
		margin-top: 14px;
	}

	.save-btn {
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

	.save-btn:hover { background: #2a2a28; }
	.save-btn:active { transform: scale(0.97); }

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

	/* Volunteer list */
	.volunteer-list {
		border-top: 1.5px solid #ededeb;
		background: #fafaf9;
		animation: expandIn 0.2s ease-out;
	}

	.empty-text {
		padding: 28px 16px;
		text-align: center;
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		color: #8a8a87;
	}

	.vol-table-wrap {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead tr {
		border-bottom: 1.5px solid #ededeb;
	}

	th {
		padding: 10px 16px;
		font-family: 'DM Mono', monospace;
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		color: #8a8a87;
		text-align: left;
		white-space: nowrap;
	}

	.text-right {
		text-align: right;
	}

	tbody tr {
		border-bottom: 1px solid #f0f0ed;
		transition: background 0.1s ease;
	}

	tbody tr:last-child {
		border-bottom: none;
	}

	tbody tr:hover {
		background: white;
	}

	td {
		padding: 10px 16px;
		white-space: nowrap;
	}

	.vol-name {
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		font-weight: 500;
		color: #141413;
	}

	.status-tag {
		display: inline-block;
		font-family: 'DM Sans', sans-serif;
		font-size: 11px;
		font-weight: 500;
		padding: 3px 8px;
		border-radius: 6px;
		background: #f0f0ed;
		color: #5a5a57;
	}

	.status-tag.first-time {
		background: #eff6ff;
		color: #2563eb;
	}

	.vol-date {
		font-family: 'DM Sans', sans-serif;
		font-size: 12px;
		color: #8a8a87;
		text-align: right;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes expandIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes menuIn {
		from {
			opacity: 0;
			transform: translateY(-4px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes toastIn {
		from { opacity: 0; transform: translateX(4px); }
		to { opacity: 1; transform: translateX(0); }
	}

	@keyframes rowIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
</style>
