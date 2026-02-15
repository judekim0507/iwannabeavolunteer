<script lang="ts">
    import "../../app.css";
    let { children } = $props();
</script>

<div class="admin-shell">
    {@render children()}
</div>

<style>
    :global(body) {
        background-color: #f7f7f5;
    }

    .admin-shell {
        min-height: 100dvh;
        min-height: 100vh;
    }
</style>
