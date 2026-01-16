<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
</script>

<div class="space-y-8 animate-pulse">
	<!-- Stats -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each Array(auth.isSuperuser ? 4 : 3) as _}
			<div class="rounded-xl border border-[#e5e5e5] bg-white p-5">
				<div class="mb-2 h-3 w-12 rounded bg-[#f0f0f0]"></div>
				<div class="h-7 w-8 rounded bg-[#f0f0f0]"></div>
			</div>
		{/each}
	</div>

	<!-- Button -->
	<div class="h-10 w-28 rounded-lg bg-[#f0f0f0]"></div>

	<!-- Events -->
	<div class="space-y-4">
		{#each Array(3) as _}
			<div class="rounded-xl border border-[#e5e5e5] bg-white p-5">
				<div class="flex items-start justify-between">
					<div class="flex items-start gap-4">
						<div class="h-5 w-5 rounded-md bg-[#f0f0f0]"></div>
						<div>
							<div class="h-5 w-40 rounded bg-[#f0f0f0]"></div>
							<div class="mt-2 h-3 w-32 rounded bg-[#f0f0f0]"></div>
						</div>
					</div>
					<div class="flex gap-2">
						<div class="h-6 w-12 rounded bg-[#f0f0f0]"></div>
						<div class="h-6 w-12 rounded bg-[#f0f0f0]"></div>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
