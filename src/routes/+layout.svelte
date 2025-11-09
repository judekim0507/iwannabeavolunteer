<script lang="ts">
  import "../app.css";
  import favicon from "$lib/assets/favicon.png";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>I wanna be a volunteer</title>
  <meta
    name="description"
    content="I wanna be a volunteer for Burnaby North Secondary School's events."
  />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Nunito:wght@700;900&display=swap"
    rel="stylesheet"
  />
  <meta name="theme-color" content="#FEFEFE" />
</svelte:head>

<main class="min-h-screen w-full px-6 py-10">
  {@render children()}
</main>
