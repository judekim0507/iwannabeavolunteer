<script lang="ts">
  import "../../app.css";
  let { children } = $props();
</script>

<main class="mx-auto max-w-[1400px] px-8 py-10">
  {@render children()}
</main>

<style>
  :global(body) {
    background-color: #fdfdfd;
  }
</style>


