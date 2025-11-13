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
    <title>I wanna be a volunteer | Burnaby North Secondary School</title>
    <meta
        name="description"
        content="Join volunteer opportunities at Burnaby North Secondary School. A multi-council volunteer registration platform for school events. Sign up to be a volunteer today!"
    />
    <meta
        name="keywords"
        content="volunteer, BNSS, Burnaby North Secondary School, school events, student council, volunteer registration, community service"
    />
    <meta name="author" content="Jude Kim" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://iwannabeavolunteer.ca/" />
    <meta property="og:title" content="I wanna be a volunteer | Burnaby North Secondary School" />
    <meta
        property="og:description"
        content="Join volunteer opportunities at Burnaby North Secondary School. A multi-council volunteer registration platform for school events."
    />
    <meta property="og:image" content="https://iwannabeavolunteer.ca/pwa-icon-512.png" />
    <meta property="og:site_name" content="I wanna be a volunteer" />
    <meta property="og:locale" content="en_US" />
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://iwannabeavolunteer.ca/" />
    <meta name="twitter:title" content="I wanna be a volunteer | Burnaby North Secondary School" />
    <meta
        name="twitter:description"
        content="Join volunteer opportunities at Burnaby North Secondary School. A multi-council volunteer registration platform for school events."
    />
    <meta name="twitter:image" content="https://iwannabeavolunteer.ca/pwa-icon-512.png" />
    
    <!-- Canonical URL -->
    <link rel="canonical" href="https://iwannabeavolunteer.ca/" />
    
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
