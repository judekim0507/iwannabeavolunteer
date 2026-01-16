<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';

	let email = $state('');
	let password = $state('');
	let isSubmitting = $state(false);

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

<div class="min-h-screen bg-[#fafafa]">
	<div class="flex min-h-screen flex-col items-center justify-center px-6">
		<div class="w-full max-w-[340px]">
			<div class="mb-8 text-center">
				<h1 class="text-[24px] font-semibold tracking-tight text-[#1a1a1a]">Welcome back</h1>
				<p class="mt-2 text-[14px] text-[#666]">Sign in to your admin account</p>
			</div>

			<div class="rounded-xl border border-[#e5e5e5] bg-white p-6">
				{#if auth.error}
					<div class="mb-5 rounded-lg bg-red-50 px-4 py-3 transition-all duration-300">
						<p class="text-[13px] text-red-600">{auth.error}</p>
					</div>
				{/if}

				<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-5">
					<div>
						<label for="email" class="mb-2 block text-[13px] font-medium text-[#1a1a1a]">Email</label>
						<input
							id="email"
							type="email"
							required
							bind:value={email}
							disabled={isSubmitting}
							placeholder="you@example.com"
							class="h-11 w-full rounded-lg border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#1a1a1a] outline-none transition-all duration-200 placeholder:text-[#999] hover:border-[#ccc] focus:border-[#1a1a1a] focus:ring-4 focus:ring-[#1a1a1a]/5 disabled:bg-[#fafafa] disabled:text-[#999]"
						/>
					</div>

					<div>
						<label for="password" class="mb-2 block text-[13px] font-medium text-[#1a1a1a]">Password</label>
						<input
							id="password"
							type="password"
							required
							bind:value={password}
							disabled={isSubmitting}
							placeholder="••••••••"
							class="h-11 w-full rounded-lg border border-[#e5e5e5] bg-white px-4 text-[14px] text-[#1a1a1a] outline-none transition-all duration-200 placeholder:text-[#999] hover:border-[#ccc] focus:border-[#1a1a1a] focus:ring-4 focus:ring-[#1a1a1a]/5 disabled:bg-[#fafafa] disabled:text-[#999]"
						/>
					</div>

					<button
						type="submit"
						disabled={!email.trim() || !password || isSubmitting}
						class="relative h-11 w-full overflow-hidden rounded-lg bg-[#1a1a1a] text-[14px] font-medium text-white transition-all duration-200 hover:bg-[#333] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#e5e5e5] disabled:text-[#999]"
					>
						{#if isSubmitting}
							<span class="flex items-center justify-center gap-2">
								<span class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
								Signing in
							</span>
						{:else}
							Continue
						{/if}
					</button>
				</form>
			</div>

			<div class="mt-6 text-center">
				<a href="/" class="text-[13px] text-[#666] transition-colors duration-200 hover:text-[#1a1a1a]">
					← Back to volunteer form
				</a>
			</div>
		</div>
	</div>
</div>
