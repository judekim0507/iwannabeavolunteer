<script lang="ts">
    import "../../app.css";
    let { children } = $props();
</script>

<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    {@render children()}
</main>

<style>
    :global(body) {
        background-color: #f5f5f5;
    }
</style>
