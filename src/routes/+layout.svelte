<script lang="ts">
    import "../app.css";
    import favicon from "$lib/assets/favicon.png";
    import { browser } from "$app/environment";
    import { registerSW } from "virtual:pwa-register";

    let { children } = $props();

    if (browser) {
        registerSW({
            immediate: true,
        });
    }
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
    <meta name="theme-color" content="#F8FAFC" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" sizes="192x192" href="/pwa-icon-192.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta
        name="apple-mobile-web-app-status-bar-style"
        content="black-translucent"
    />
</svelte:head>

<main class="min-h-screen w-full">
    {@render children()}
</main>
