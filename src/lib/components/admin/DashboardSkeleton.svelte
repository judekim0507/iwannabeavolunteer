<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
</script>

<div class="skeleton">
	<div class="skel-stats" class:four={auth.isSuperuser}>
		{#each Array(auth.isSuperuser ? 4 : 3) as _, i}
			<div class="skel-card" style="animation-delay: {i * 60}ms">
				<div class="skel-line w-12 h-2.5"></div>
				<div class="skel-line w-8 h-6 mt-3"></div>
			</div>
		{/each}
	</div>

	<div class="skel-btn" style="animation-delay: 200ms"></div>

	<div class="skel-events">
		{#each Array(3) as _, i}
			<div class="skel-event" style="animation-delay: {260 + i * 60}ms">
				<div class="skel-event-left">
					<div class="skel-line w-5 h-5 rounded"></div>
					<div>
						<div class="skel-line w-32 h-4"></div>
						<div class="skel-line w-24 h-3 mt-2"></div>
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.skeleton {
		animation: fadeIn 0.3s ease-out;
	}

	.skel-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}

	.skel-stats.four {
		grid-template-columns: repeat(2, 1fr);
	}

	@media (min-width: 640px) {
		.skel-stats.four {
			grid-template-columns: repeat(4, 1fr);
		}

		.skel-stats {
			gap: 10px;
		}
	}

	.skel-card {
		background: white;
		border: 1.5px solid #ededeb;
		border-radius: 12px;
		padding: 14px 16px;
		animation: pulseIn 0.4s ease-out both;
	}

	.skel-btn {
		width: 110px;
		height: 40px;
		border-radius: 10px;
		background: #ededeb;
		margin-top: 28px;
		margin-bottom: 24px;
		animation: pulseIn 0.4s ease-out both;
	}

	.skel-events {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.skel-event {
		background: white;
		border: 1.5px solid #ededeb;
		border-radius: 12px;
		padding: 18px 16px;
		animation: pulseIn 0.4s ease-out both;
	}

	.skel-event-left {
		display: flex;
		align-items: flex-start;
		gap: 14px;
	}

	.skel-line {
		border-radius: 6px;
		background: #f0f0ed;
		animation: shimmer 1.8s ease-in-out infinite;
	}

	/* Tailwind-style utility classes for skeleton lines */
	.w-5 { width: 20px; }
	.w-8 { width: 32px; }
	.w-12 { width: 48px; }
	.w-24 { width: 96px; }
	.w-32 { width: 128px; }
	.h-2\.5 { height: 10px; }
	.h-3 { height: 12px; }
	.h-4 { height: 16px; }
	.h-5 { height: 20px; }
	.h-6 { height: 24px; }
	.mt-2 { margin-top: 8px; }
	.mt-3 { margin-top: 12px; }
	.rounded { border-radius: 6px; }

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes pulseIn {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes shimmer {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
</style>
