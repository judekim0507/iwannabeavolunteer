<script lang="ts">
    import "../../app.css";
    import { Toaster } from 'svelte-sonner';
    let { children } = $props();
</script>

<div class="admin-shell">
    {@render children()}
</div>

<Toaster
    position="bottom-center"
    toastOptions={{
        style: "font-family: 'DM Sans', sans-serif; font-size: 13px; border-radius: 10px; padding: 12px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);",
    }}
/>

<style>
    :global(body) {
        background-color: #f7f7f5;
    }

    .admin-shell {
        min-height: 100dvh;
        min-height: 100vh;
    }
</style>
