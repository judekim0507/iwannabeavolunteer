<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';

	let email = $state('');
	let password = $state('');
	let isSubmitting = $state(false);
	let focusedField = $state<string | null>(null);

	async function handleSubmit() {
		if (!email.trim() || !password) return;
		isSubmitting = true;
		await auth.signIn(email, password);
		isSubmitting = false;
		if (!auth.error) {
			email = '';
			password = '';
		}
	}
</script>

<div class="login-page">
	<div class="login-container">
		<div class="login-card">
			<header class="login-header">
				<h1>Welcome back</h1>
				<p>Sign in to continue</p>
			</header>

			{#if auth.error}
				<div class="error-banner" role="alert">
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
						<path d="M8 4.5v4M8 10.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
					<span>{auth.error}</span>
				</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<div class="field" class:focused={focusedField === 'email'}>
					<label for="email">Email</label>
					<input
						id="email"
						type="email"
						required
						bind:value={email}
						disabled={isSubmitting}
						placeholder="you@example.com"
						onfocus={() => focusedField = 'email'}
						onblur={() => focusedField = null}
						autocomplete="email"
					/>
				</div>

				<div class="field" class:focused={focusedField === 'password'}>
					<label for="password">Password</label>
					<input
						id="password"
						type="password"
						required
						bind:value={password}
						disabled={isSubmitting}
						placeholder="Enter your password"
						onfocus={() => focusedField = 'password'}
						onblur={() => focusedField = null}
						autocomplete="current-password"
					/>
				</div>

				<button
					type="submit"
					disabled={!email.trim() || !password || isSubmitting}
					class="submit-btn"
				>
					{#if isSubmitting}
						<span class="spinner"></span>
						<span>Signing in</span>
					{:else}
						<span>Continue</span>
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
							<path d="M5.25 3.5L8.75 7L5.25 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					{/if}
				</button>
			</form>

			<a href="/" class="back-link">
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
					<path d="M8.75 10.5L5.25 7L8.75 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				Back to volunteer form
			</a>
		</div>
	</div>
</div>

<style>
	.login-page {
		min-height: 100dvh;
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px 20px;
		background: #f7f7f5;
	}

	.login-container {
		width: 100%;
		max-width: 380px;
	}

	.login-card {
		animation: cardIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.login-header {
		margin-bottom: 32px;
	}

	.login-header h1 {
		font-family: 'DM Sans', sans-serif;
		font-size: 26px;
		font-weight: 600;
		letter-spacing: -0.5px;
		color: #141413;
		line-height: 1.15;
	}

	.login-header p {
		font-family: 'DM Sans', sans-serif;
		font-size: 15px;
		color: #8a8a87;
		margin-top: 8px;
		letter-spacing: -0.1px;
	}

	.error-banner {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 12px 14px;
		border-radius: 10px;
		background: #fef2f2;
		color: #c53030;
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		line-height: 1.45;
		margin-bottom: 24px;
		animation: fadeSlide 0.2s ease-out;
	}

	.error-banner svg {
		flex-shrink: 0;
		margin-top: 1px;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.field {
		position: relative;
	}

	.field label {
		display: block;
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		font-weight: 500;
		color: #5a5a57;
		margin-bottom: 8px;
		letter-spacing: -0.1px;
		transition: color 0.2s ease;
	}

	.field.focused label {
		color: #141413;
	}

	.field input {
		width: 100%;
		height: 46px;
		padding: 0 14px;
		border: 1.5px solid #e2e2df;
		border-radius: 10px;
		background: white;
		font-family: 'DM Sans', sans-serif;
		font-size: 15px;
		color: #141413;
		outline: none;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
		-webkit-appearance: none;
	}

	.field input::placeholder {
		color: #b5b5b2;
	}

	.field input:hover:not(:disabled) {
		border-color: #c8c8c5;
	}

	.field input:focus {
		border-color: #141413;
		box-shadow: 0 0 0 3px rgba(20, 20, 19, 0.06);
	}

	.field input:disabled {
		background: #fafaf9;
		color: #b5b5b2;
		cursor: not-allowed;
	}

	.submit-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 46px;
		width: 100%;
		border: none;
		border-radius: 10px;
		background: #141413;
		color: white;
		font-family: 'DM Sans', sans-serif;
		font-size: 15px;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s ease, transform 0.1s ease, opacity 0.2s ease;
		margin-top: 4px;
		letter-spacing: -0.1px;
	}

	.submit-btn:hover:not(:disabled) {
		background: #2a2a28;
	}

	.submit-btn:active:not(:disabled) {
		transform: scale(0.985);
	}

	.submit-btn:disabled {
		background: #e2e2df;
		color: #b5b5b2;
		cursor: not-allowed;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.25);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-family: 'DM Sans', sans-serif;
		font-size: 13px;
		color: #8a8a87;
		text-decoration: none;
		margin-top: 28px;
		transition: color 0.2s ease;
	}

	.back-link:hover {
		color: #141413;
	}

	@keyframes cardIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes fadeSlide {
		from { opacity: 0; transform: translateY(-4px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
