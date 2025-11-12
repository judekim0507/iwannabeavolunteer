<script lang="ts">
    import {
        supabase,
        type Event,
        type Volunteer,
        type Council,
        type CouncilAdmin,
    } from "$lib/supabase";
    import { onMount } from "svelte";
    import type { User } from "@supabase/supabase-js";
    import { PUBLIC_WHEEL_OF_NAMES_KEY } from "$env/static/public";
    import { APP_VERSION } from "$lib/appVersion";

    let user = $state<User | null>(null);
    let adminRole = $state<CouncilAdmin | null>(null);
    let userCouncil = $state<Council | null>(null);

    let councils = $state<Council[]>([]);
    let events = $state<Event[]>([]);
    let volunteers = $state<Volunteer[]>([]);
    let allAdmins = $state<(CouncilAdmin & { email?: string })[]>([]);

    let loading = $state(true);
    let error = $state("");
    let successMessage = $state("");
    let councilFilterId = $state<string | null>(null);

    let email = $state("");
    let password = $state("");
    let authError = $state("");

    // Event creation
    let newEventName = $state("");
    let newEventEmoji = $state("");
    let newEventEndsAt = $state("");
    let newEventCouncilId = $state("");
    let creatingEvent = $state(false);

    // Event editing
    let editingEventId = $state<string | null>(null);
    let editEventName = $state("");
    let editEventEmoji = $state("");
    let editEventEndsAt = $state("");
    let deletingEvent = $state<string | null>(null);
    let copySuccess = $state<string | null>(null);
    let expandedEventId = $state<string | null>(null);
    let creatingWheelForEventId = $state<string | null>(null);

    // Council management
    let newCouncilName = $state("");
    let creatingCouncil = $state(false);
    let deletingCouncil = $state<string | null>(null);

    // Admin management
    let newAdminEmail = $state("");
    let newAdminPassword = $state("");
    let newAdminCouncilId = $state("");
    let creatingAdmin = $state(false);
    let deletingAdmin = $state<string | null>(null);

    let hasInitialized = $state(false);
    let isInitializing = $state(false);

    onMount(() => {
        let isMounted = true;

        (async () => {
            const {
                data: { user: currentUser },
            } = await supabase.auth.getUser();

            if (currentUser) {
                user = currentUser;
                await initializeDashboard();
            }

            if (isMounted) {
                loading = false;
            }
        })();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === "SIGNED_IN" && session?.user && isMounted) {
                    user = session.user;
                    await initializeDashboard();
                }

                if (event === "SIGNED_OUT" && isMounted) {
                    user = null;
                    adminRole = null;
                    userCouncil = null;
                    councils = [];
                    events = [];
                    volunteers = [];
                    allAdmins = [];
                    hasInitialized = false;
                    isInitializing = false;
                    loading = false;
                }
            },
        );

        return () => {
            isMounted = false;
            authListener?.subscription?.unsubscribe();
        };
    });

    function flashSuccess(message: string) {
        successMessage = message;
        setTimeout(() => {
            if (successMessage === message) {
                successMessage = "";
            }
        }, 3000);
    }

    async function initializeDashboard() {
        if (isInitializing || !user) return;
        isInitializing = true;
        if (!hasInitialized) loading = true;
        error = "";
        successMessage = "";

        try {
            await loadUserRole();

            if (!user || !adminRole) {
                // Don't call handleLogout here to avoid race conditions
                // Just reset the initialization flags
                isInitializing = false;
                loading = false;
                return;
            }

            await loadCouncils();
            await Promise.all([loadEvents(), loadVolunteers()]);

            if (isSuperuser()) {
                await loadAllAdmins();
                if (!newEventCouncilId && councils.length > 0) {
                    newEventCouncilId = councils[0].id;
                }
            } else if (userCouncil) {
                newEventCouncilId = userCouncil.id;
            }

            hasInitialized = true;
        } catch (err) {
            console.error("Dashboard initialization error:", err);
            error = "Failed to load dashboard. Please try refreshing.";
        } finally {
            loading = false;
            isInitializing = false;
        }
    }

    async function loadUserRole() {
        if (!user) return;

        const { data, error: err } = await supabase
            .from("council_admins")
            .select("*")
            .eq("user_id", user.id)
            .single();

        if (err) {
            if (err.code === "PGRST116") {
                error = `Access denied: your account (${user.email}) is not registered as an admin.`;
            } else {
                error = `Database error: ${err.message}`;
            }
            // Sign out without triggering race conditions
            supabase.auth.signOut();
            return;
        }

        adminRole = data;

        if (data.council_id) {
            const { data: councilData } = await supabase
                .from("councils")
                .select("*")
                .eq("id", data.council_id)
                .single();

            userCouncil = councilData ?? null;
        } else {
            userCouncil = null;
        }
    }

    async function loadCouncils() {
        const { data, error: err } = await supabase
            .from("councils")
            .select("*")
            .order("name", { ascending: true });

        if (err) {
            error = err.message;
        } else {
            councils = data || [];
        }
    }

    async function loadEvents() {
        if (!adminRole) return;

        let query = supabase.from("events").select("*").order("created_at", {
            ascending: false,
        });

        if (!isSuperuser() && userCouncil) {
            query = query.eq("council_id", userCouncil.id);
        }

        const { data, error: err } = await query;

        if (err) {
            error = err.message;
        } else {
            events = data || [];
            if (
                editingEventId &&
                !events.find((event) => event.id === editingEventId)
            ) {
                cancelEditEvent();
            }
        }
    }

    async function loadVolunteers() {
        const { data, error: err } = await supabase
            .from("volunteers")
            .select("*")
            .order("created_at", { ascending: false });

        if (err) {
            error = err.message;
        } else {
            volunteers = data || [];
        }
    }

    async function loadAllAdmins() {
        if (!isSuperuser()) return;

        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) return;

        const response = await fetch("/api/list-admins", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            error = result.error || "Failed to load admin accounts";
            return;
        }

        allAdmins = result.admins || [];
    }

    function isSuperuser() {
        return adminRole?.role === "superuser";
    }

    async function handleLogin(event?: SubmitEvent) {
        event?.preventDefault();
        authError = "";

        const { error: err } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (err) {
            authError = err.message;
            return;
        }

        const {
            data: { user: signedInUser },
        } = await supabase.auth.getUser();

        if (signedInUser) {
            user = signedInUser;
            await initializeDashboard();
            loading = false;
        }

        email = "";
        password = "";
    }

    async function handleLogout() {
        await supabase.auth.signOut();
        user = null;
        adminRole = null;
        userCouncil = null;
        councils = [];
        events = [];
        volunteers = [];
        allAdmins = [];
        hasInitialized = false;
        isInitializing = false;
        loading = false;
    }

    async function createEvent() {
        if (!newEventName.trim()) return;

        const councilId = isSuperuser()
            ? newEventCouncilId
            : userCouncil?.id || adminRole?.council_id;

        if (!councilId) {
            error = "Select a council before creating an event.";
            return;
        }

        creatingEvent = true;
        error = "";

        let endsAtISO: string | null = null;
        if (newEventEndsAt) {
            endsAtISO = new Date(newEventEndsAt).toISOString();
        }

        const { error: err } = await supabase.from("events").insert({
            name: newEventName,
            emoji: newEventEmoji,
            ends_at: endsAtISO,
            is_active: false,
            council_id: councilId,
        });

        creatingEvent = false;

        if (err) {
            error = err.message;
            return;
        }

        newEventName = "";
        newEventEmoji = "";
        newEventEndsAt = "";

        if (isSuperuser()) {
            newEventCouncilId = councilId;
        }

        await loadEvents();
        flashSuccess("Event created successfully");
    }

    async function toggleEventActive(eventId: string, currentStatus: boolean) {
        const targetEvent = events.find((event) => event.id === eventId);
        if (!targetEvent) return;

        error = "";

        if (!currentStatus) {
            await supabase
                .from("events")
                .update({ is_active: false })
                .eq("council_id", targetEvent.council_id);
        }

        const { error: err } = await supabase
            .from("events")
            .update({ is_active: !currentStatus })
            .eq("id", eventId);

        if (err) {
            error = err.message;
            return;
        }

        await loadEvents();
        flashSuccess(!currentStatus ? "Event activated" : "Event deactivated");
    }

    function startEditEvent(event: Event) {
        editingEventId = event.id;
        editEventName = event.name;
        editEventEmoji = event.emoji || "";

        if (event.ends_at) {
            const date = new Date(event.ends_at);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            editEventEndsAt = `${year}-${month}-${day}T${hours}:${minutes}`;
        } else {
            editEventEndsAt = "";
        }
    }

    function cancelEditEvent() {
        editingEventId = null;
        editEventName = "";
        editEventEmoji = "";
        editEventEndsAt = "";
    }

    async function saveEventEdits() {
        if (!editingEventId || !editEventName.trim()) return;

        error = "";

        let endsAtISO: string | null = null;
        if (editEventEndsAt) {
            endsAtISO = new Date(editEventEndsAt).toISOString();
        }

        const { error: err } = await supabase
            .from("events")
            .update({
                name: editEventName,
                emoji: editEventEmoji,
                ends_at: endsAtISO,
            })
            .eq("id", editingEventId);

        if (err) {
            error = err.message;
            return;
        }

        await loadEvents();
        flashSuccess("Event updated");
        cancelEditEvent();
    }

    async function deleteEvent(eventId: string) {
        if (!confirm("Delete this event and all its volunteers?")) return;

        deletingEvent = eventId;
        error = "";

        const { error: err } = await supabase
            .from("events")
            .delete()
            .eq("id", eventId);

        deletingEvent = null;

        if (err) {
            error = err.message;
            return;
        }

        await Promise.all([loadEvents(), loadVolunteers()]);
        flashSuccess("Event deleted");
    }

    function getVolunteersForEvent(eventId: string) {
        return volunteers.filter((volunteer) => volunteer.event_id === eventId);
    }

    async function copyVolunteerNames(eventId: string) {
        const list = getVolunteersForEvent(eventId);
        const names = list.map((volunteer) => volunteer.full_name).join("\n");

        if (!names) {
            error = "No volunteers to copy";
            return;
        }

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(names);
            } else {
                const textarea = document.createElement("textarea");
                textarea.value = names;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);
            }

            copySuccess = eventId;
            setTimeout(() => {
                if (copySuccess === eventId) {
                    copySuccess = null;
                }
            }, 2000);
        } catch (err) {
            error = "Failed to copy to clipboard";
        }
    }

    async function createRandomPickerForEvent(event: Event) {
        const list = getVolunteersForEvent(event.id);
        if (list.length === 0) {
            error = "No volunteers to add to the wheel";
            return;
        }
        creatingWheelForEventId = event.id;
        error = "";
        try {
            const entries = list.map((v) => ({ label: v.full_name }));
            const resp = await fetch("/api/wheel", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: `${event.name} — Random Picker`,
                    description: `Random selection wheel for ${event.name}`,
                    entries,
                }),
            });
            const data = await resp.json();
            if (!resp.ok) {
                error = data?.message || "Failed to create wheel";
                creatingWheelForEventId = null;
                return;
            }
            const url = data?.url;
            if (url) {
                window.open(url, "_blank", "noopener,noreferrer");
                flashSuccess("Random picker wheel created");
            } else {
                // If structure unknown, show JSON for debugging
                console.info("Wheel API response", data);
                flashSuccess(
                    "Random picker wheel created (check console for link)",
                );
            }
        } catch (e: any) {
            error = e?.message || "Failed to create wheel";
        } finally {
            creatingWheelForEventId = null;
        }
    }

    function getCouncilName(councilId: string | null) {
        if (!councilId) return "Unassigned";
        return (
            councils.find((council) => council.id === councilId)?.name ||
            "Unknown"
        );
    }

    async function createCouncil() {
        if (!newCouncilName.trim()) return;

        creatingCouncil = true;
        error = "";

        const { error: err } = await supabase
            .from("councils")
            .insert({ name: newCouncilName.trim() });

        creatingCouncil = false;

        if (err) {
            error = err.message;
            return;
        }

        newCouncilName = "";
        await loadCouncils();
        flashSuccess("Council created");
    }

    async function deleteCouncil(councilId: string) {
        if (!confirm("Delete this council and all its events?")) return;

        deletingCouncil = councilId;
        error = "";

        const { error: err } = await supabase
            .from("councils")
            .delete()
            .eq("id", councilId);

        deletingCouncil = null;

        if (err) {
            error = err.message;
            return;
        }

        await loadCouncils();
        await loadEvents();
        await loadVolunteers();
        if (isSuperuser()) {
            await loadAllAdmins();
        }
        flashSuccess("Council deleted");
    }

    async function createCouncilAdmin() {
        if (
            !newAdminEmail.trim() ||
            !newAdminPassword.trim() ||
            !newAdminCouncilId
        ) {
            error = "Email, password, and council are required";
            return;
        }

        creatingAdmin = true;
        error = "";

        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            error = "Not authenticated";
            creatingAdmin = false;
            return;
        }

        const response = await fetch("/api/create-admin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                email: newAdminEmail.trim(),
                password: newAdminPassword,
                councilId: newAdminCouncilId,
            }),
        });

        const result = await response.json();
        creatingAdmin = false;

        if (!response.ok) {
            error = result.error || "Failed to create admin account";
            return;
        }

        newAdminEmail = "";
        newAdminPassword = "";
        newAdminCouncilId = "";
        await loadAllAdmins();
        flashSuccess("Admin account created");
    }

    async function deleteCouncilAdmin(adminId: string, userId: string) {
        if (!confirm("Delete this admin account?")) return;

        deletingAdmin = adminId;
        error = "";

        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            error = "Not authenticated";
            deletingAdmin = null;
            return;
        }

        const response = await fetch("/api/delete-admin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ adminId, userId }),
        });

        const result = await response.json();
        deletingAdmin = null;

        if (!response.ok) {
            error = result.error || "Failed to delete admin account";
            return;
        }

        await loadAllAdmins();
        flashSuccess("Admin account removed");
    }
</script>

<svelte:head>
    <title>Admin · I wanna be a volunteer</title>
</svelte:head>

<div class="w-full h-full space-y-10">
    {#if !user}
        <div class="max-w-md mx-auto pt-12">
            <div class="text-center mb-10 space-y-3">
                <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    class="mx-auto text-[#333]"
                    aria-hidden="true"
                >
                    <rect
                        x="3"
                        y="11"
                        width="18"
                        height="11"
                        rx="2"
                        stroke="currentColor"
                        stroke-width="2"
                    />
                    <path
                        d="M7 11V7a5 5 0 0 1 10 0v4"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                    />
                </svg>
                <div>
                    <h1
                        class="font-['Nunito'] font-black text-[28px] text-[#020202]"
                    >
                        Admin Access
                    </h1>
                    <p class="font-['Inter'] text-[15px] text-[#666]">
                        Sign in with your council credentials
                    </p>
                </div>
            </div>

            <form
                class="rounded-2xl border border-[#eaeaea] bg-white p-8 space-y-5"
                onsubmit={handleLogin}
            >
                {#if authError}
                    <div
                        class="rounded-xl border border-red-200 bg-red-50 p-3 text-center"
                    >
                        <p class="font-['Inter'] text-[13px] text-red-700">
                            {authError}
                        </p>
                    </div>
                {/if}

                <div class="space-y-2">
                    <label
                        for="email"
                        class="font-['Inter'] text-[13px] font-medium text-[#555]"
                        >Email</label
                    >
                    <input
                        id="email"
                        type="email"
                        required
                        class="h-14 w-full rounded-[73px] border-[3px] border-[#f2f2f2] bg-white px-6 font-['Nunito'] text-[16px] text-[#333] outline-none transition focus:border-[#8b3ffc]"
                        bind:value={email}
                    />
                </div>

                <div class="space-y-2">
                    <label
                        for="password"
                        class="font-['Inter'] text-[13px] font-medium text-[#555]"
                        >Password</label
                    >
                    <input
                        id="password"
                        type="password"
                        required
                        class="h-14 w-full rounded-[73px] border-[3px] border-[#f2f2f2] bg-white px-6 font-['Nunito'] text-[16px] text-[#333] outline-none transition focus:border-[#8b3ffc]"
                        bind:value={password}
                    />
                </div>

                <button
                    type="submit"
                    class="w-full h-14 rounded-[73px] border-[3px] border-[#4dfb59] bg-[#e2ffdd] font-['Nunito'] font-black text-[17px] text-[#333] transition hover:bg-[#d4f5cc] active:scale-95"
                    disabled={!email.trim() || !password.trim()}
                >
                    Sign In
                </button>
            </form>

            <div class="text-center pt-8">
                <a
                    href="/"
                    class="inline-flex items-center gap-1 font-['Inter'] text-[13px] text-[#999] hover:text-[#333]"
                >
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to volunteer form
                </a>
            </div>
        </div>
    {:else}
        <div class="space-y-6">
            <header
                class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
                <div class="space-y-1">
                    <p
                        class="font-['Inter'] text-[13px] uppercase tracking-[0.12em] text-[#888]"
                    >
                        {isSuperuser()
                            ? "Superuser"
                            : userCouncil
                              ? userCouncil.name
                              : "Council Admin"}
                    </p>
                    <h1
                        class="font-['Nunito'] font-black text-[32px] leading-none text-[#020202]"
                    >
                        Dashboard
                    </h1>
                    <p class="font-['Inter'] text-[14px] text-[#888]">
                        Signed in as {user.email}
                    </p>
                </div>

                <div class="flex items-center gap-4">
                    {#if isSuperuser()}
                        <div class="flex flex-wrap items-center gap-2">
                            <label
                                for="council-filter"
                                class="font-['Inter'] text-[12px] text-[#666]"
                                >Filter</label
                            >
                            <select
                                id="council-filter"
                                class="h-10 rounded-[12px] border border-[#e2e2e2] bg-white px-3 font-['Nunito'] text-[14px] text-[#333] outline-none transition focus:border-[#8b3ffc]"
                                bind:value={councilFilterId}
                            >
                                <option value={null}>All councils</option>
                                {#each councils as council (council.id)}
                                    <option value={council.id}
                                        >{council.name}</option
                                    >
                                {/each}
                            </select>
                        </div>
                    {/if}
                    <button
                        type="button"
                        class="self-start rounded-[73px] border border-[#e0e0e0] px-6 py-2 font-['Nunito'] text-[14px] text-[#555] transition hover:border-[#ccc] hover:text-[#222]"
                        onclick={handleLogout}
                    >
                        Logout
                    </button>
                </div>
            </header>

            <!-- Overview cards -->
            <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div class="rounded-2xl border border-[#eaeaea] bg-white p-4">
                    <p class="font-['Inter'] text-[12px] text-[#777]">
                        Active events
                    </p>
                    <p
                        class="font-['Nunito'] font-black text-[24px] text-[#222]"
                    >
                        {events.filter((e) => e.is_active).length}
                    </p>
                </div>
                <div class="rounded-2xl border border-[#eaeaea] bg-white p-4">
                    <p class="font-['Inter'] text-[12px] text-[#777]">
                        Total events
                    </p>
                    <p
                        class="font-['Nunito'] font-black text-[24px] text-[#222]"
                    >
                        {events.length}
                    </p>
                </div>
                <div class="rounded-2xl border border-[#eaeaea] bg-white p-4">
                    <p class="font-['Inter'] text-[12px] text-[#777]">
                        Volunteers
                    </p>
                    <p
                        class="font-['Nunito'] font-black text-[24px] text-[#222]"
                    >
                        {volunteers.length}
                    </p>
                </div>
                {#if isSuperuser()}
                    <div
                        class="rounded-2xl border border-[#eaeaea] bg-white p-4"
                    >
                        <p class="font-['Inter'] text-[12px] text-[#777]">
                            Councils
                        </p>
                        <p
                            class="font-['Nunito'] font-black text-[24px] text-[#222]"
                        >
                            {councils.length}
                        </p>
                    </div>
                {/if}
            </section>

            {#if error}
                <div class="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <p class="font-['Inter'] text-[14px] text-red-700">
                        {error}
                    </p>
                </div>
            {/if}

            {#if successMessage}
                <div
                    class="rounded-2xl border border-[#4dfb59] bg-[#eafde3] p-4"
                >
                    <p class="font-['Inter'] text-[14px] text-[#20552a]">
                        {successMessage}
                    </p>
                </div>
            {/if}

            {#if loading}
                <div class="grid gap-6 xl:grid-cols-[2fr_1fr]">
                    <!-- Left column skeleton -->
                    <div class="space-y-6">
                        <div
                            class="rounded-2xl border border-[#eaeaea] bg-white p-6 animate-pulse"
                        >
                            <div
                                class="h-5 w-40 bg-neutral-200 rounded mb-2"
                            ></div>
                            <div
                                class="h-4 w-60 bg-neutral-200 rounded mb-6"
                            ></div>
                            <div class="grid gap-4 sm:grid-cols-2">
                                <div
                                    class="h-12 bg-neutral-100 rounded-[16px]"
                                ></div>
                                <div
                                    class="h-12 bg-neutral-100 rounded-[16px]"
                                ></div>
                                <div
                                    class="h-12 bg-neutral-100 rounded-[16px] sm:col-span-2"
                                ></div>
                            </div>
                            <div
                                class="h-12 mt-6 bg-neutral-100 rounded-[16px]"
                            ></div>
                        </div>
                        <div
                            class="rounded-2xl border border-[#eaeaea] bg-white p-6 space-y-4 animate-pulse"
                        >
                            <div class="flex items-baseline justify-between">
                                <div
                                    class="h-5 w-28 bg-neutral-200 rounded"
                                ></div>
                                <div
                                    class="h-3 w-16 bg-neutral-200 rounded"
                                ></div>
                            </div>
                            <div class="space-y-3">
                                <div
                                    class="h-16 bg-neutral-100 rounded-xl"
                                ></div>
                                <div
                                    class="h-16 bg-neutral-100 rounded-xl"
                                ></div>
                                <div
                                    class="h-16 bg-neutral-100 rounded-xl"
                                ></div>
                            </div>
                        </div>
                    </div>
                    <!-- Right column skeleton -->
                    <div class="space-y-6">
                        <div
                            class="rounded-2xl border border-[#eaeaea] bg-white p-6 animate-pulse"
                        >
                            <div
                                class="h-5 w-28 bg-neutral-200 rounded mb-4"
                            ></div>
                            <div class="space-y-2">
                                <div
                                    class="h-11 bg-neutral-100 rounded-[16px]"
                                ></div>
                                <div
                                    class="h-11 bg-neutral-100 rounded-[16px]"
                                ></div>
                                <div
                                    class="h-11 bg-neutral-100 rounded-[16px]"
                                ></div>
                            </div>
                            <div
                                class="h-10 mt-4 bg-neutral-100 rounded-[12px]"
                            ></div>
                        </div>
                        <div
                            class="rounded-2xl border border-[#eaeaea] bg-white p-6 animate-pulse"
                        >
                            <div
                                class="h-5 w-36 bg-neutral-200 rounded mb-4"
                            ></div>
                            <div class="space-y-3">
                                <div
                                    class="h-12 bg-neutral-100 rounded-[12px]"
                                ></div>
                                <div
                                    class="h-12 bg-neutral-100 rounded-[12px]"
                                ></div>
                                <div
                                    class="h-12 bg-neutral-100 rounded-[12px]"
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            {:else}
                <div class="grid gap-6 xl:grid-cols-[2fr_1fr]">
                    <section class="space-y-6">
                        <div
                            class="rounded-2xl border border-[#eaeaea] bg-white p-6 space-y-4"
                        >
                            <div class="space-y-1">
                                <h2
                                    class="font-['Nunito'] font-black text-[20px] text-[#222]"
                                >
                                    Create an event
                                </h2>
                                <p
                                    class="font-['Inter'] text-[13px] text-[#777]"
                                >
                                    Publish a new volunteer opportunity for your
                                    council
                                </p>
                            </div>

                            {#if isSuperuser() && councils.length > 0}
                                <div class="grid gap-3 sm:grid-cols-2">
                                    <div class="space-y-2">
                                        <label
                                            class="font-['Inter'] text-[13px] font-medium text-[#555]"
                                            >Council</label
                                        >
                                        <select
                                            class="h-12 w-full rounded-[16px] border border-[#e2e2e2] bg-white px-4 font-['Nunito'] text-[15px] text-[#333] outline-none transition focus:border-[#8b3ffc]"
                                            bind:value={newEventCouncilId}
                                        >
                                            {#each councils as council (council.id)}
                                                <option value={council.id}
                                                    >{council.name}</option
                                                >
                                            {/each}
                                        </select>
                                    </div>
                                    <div class="space-y-2">
                                        <label
                                            class="font-['Inter'] text-[13px] font-medium text-[#555]"
                                            >Status</label
                                        >
                                        <div
                                            class="h-12 flex items-center rounded-[16px] border border-[#f2f2f2] bg-[#fafafa] px-4 font-['Inter'] text-[13px] text-[#666]"
                                        >
                                            {events
                                                .filter(
                                                    (e) =>
                                                        e.council_id ===
                                                        newEventCouncilId,
                                                )
                                                .filter((e) => e.is_active)
                                                .length} active in this council
                                        </div>
                                    </div>
                                </div>
                            {/if}

                            {#if isSuperuser()}
                                <div class="space-y-2">
                                    <label
                                        for="event-council"
                                        class="font-['Inter'] text-[13px] font-medium text-[#555]"
                                        >Council</label
                                    >
                                    <select
                                        id="event-council"
                                        class="h-12 w-full rounded-[16px] border border-[#e2e2e2] bg-white px-4 font-['Nunito'] text-[15px] text-[#333] outline-none transition focus:border-[#8b3ffc]"
                                        bind:value={newEventCouncilId}
                                    >
                                        <option value="" disabled
                                            >Select council</option
                                        >
                                        {#each councils as council (council.id)}
                                            <option value={council.id}
                                                >{council.name}</option
                                            >
                                        {/each}
                                    </select>
                                </div>
                            {/if}

                            <div class="grid gap-4 sm:grid-cols-2">
                                <div class="space-y-2 sm:col-span-2">
                                    <label
                                        for="event-name"
                                        class="font-['Inter'] text-[13px] font-medium text-[#555]"
                                        >Event name</label
                                    >
                                    <input
                                        id="event-name"
                                        type="text"
                                        class="h-12 w-full rounded-[16px] border border-[#e2e2e2] bg-white px-4 font-['Nunito'] text-[16px] text-[#333] outline-none transition focus:border-[#8b3ffc]"
                                        placeholder="e.g. Bubble Tea Fundraiser"
                                        bind:value={newEventName}
                                    />
                                </div>

                                <div class="space-y-2">
                                    <label
                                        for="event-emoji"
                                        class="font-['Inter'] text-[13px] font-medium text-[#555]"
                                        >Emoji</label
                                    >
                                    <input
                                        id="event-emoji"
                                        type="text"
                                        maxlength="4"
                                        class="h-12 w-full rounded-[16px] border border-[#e2e2e2] bg-white px-4 font-['Nunito'] text-[16px] text-[#333] outline-none transition focus:border-[#8b3ffc]"
                                        placeholder="Optional"
                                        bind:value={newEventEmoji}
                                    />
                                </div>

                                <div class="space-y-2">
                                    <label
                                        for="event-ends"
                                        class="font-['Inter'] text-[13px] font-medium text-[#555]"
                                        >Ends at</label
                                    >
                                    <input
                                        id="event-ends"
                                        type="datetime-local"
                                        class="h-12 w-full rounded-[16px] border border-[#e2e2e2] bg-white px-4 font-['Nunito'] text-[16px] text-[#333] outline-none transition focus:border-[#8b3ffc]"
                                        bind:value={newEventEndsAt}
                                    />
                                </div>
                            </div>

                            {#if !isSuperuser() && userCouncil}
                                <p
                                    class="font-['Inter'] text-[13px] text-[#777]"
                                >
                                    Events will be created under <span
                                        class="font-semibold"
                                        >{userCouncil.name}</span
                                    >.
                                </p>
                            {/if}

                            <button
                                type="button"
                                class="h-12 w-full rounded-[16px] border border-[#4dfb59] bg-[#e2ffdd] font-['Nunito'] font-black text-[16px] text-[#1f4d22] transition hover:bg-[#d6f4c9] disabled:cursor-not-allowed disabled:opacity-60"
                                onclick={createEvent}
                                disabled={creatingEvent ||
                                    !newEventName.trim() ||
                                    (!isSuperuser() && !userCouncil) ||
                                    (isSuperuser() && !newEventCouncilId)}
                            >
                                {creatingEvent ? "Creating..." : "Create event"}
                            </button>
                        </div>

                        <div
                            class="rounded-2xl border border-[#eaeaea] bg-white p-6 space-y-4"
                        >
                            <div class="flex items-baseline justify-between">
                                <h2
                                    class="font-['Nunito'] font-black text-[20px] text-[#222]"
                                >
                                    Events
                                </h2>
                                <span
                                    class="font-['Inter'] text-[13px] text-[#777]"
                                >
                                    {(councilFilterId
                                        ? events.filter(
                                              (e) =>
                                                  e.council_id ===
                                                  councilFilterId,
                                          )
                                        : events
                                    ).length} total
                                </span>
                            </div>

                            {#if (councilFilterId ? events.filter((e) => e.council_id === councilFilterId) : events).length === 0}
                                <div
                                    class="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-6 text-center"
                                >
                                    <p
                                        class="font-['Nunito'] font-bold text-[16px] text-[#666]"
                                    >
                                        No events yet
                                    </p>
                                    <p
                                        class="font-['Inter'] text-[13px] text-[#9a9a9a]"
                                    >
                                        Create your first event using the form
                                        above.
                                    </p>
                                </div>
                            {:else}
                                <div
                                    class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3"
                                >
                                    {#each councilFilterId ? events.filter((e) => e.council_id === councilFilterId) : events as event (event.id)}
                                        <div
                                            class="rounded-xl border border-[#f0f0f0] bg-white p-5 space-y-4"
                                        >
                                            {#if editingEventId === event.id}
                                                <div class="space-y-3">
                                                    <div class="space-y-2">
                                                        <label
                                                            class="font-['Inter'] text-[13px] text-[#555]"
                                                            for={`edit-name-${event.id}`}
                                                        >
                                                            Event name
                                                        </label>
                                                        <input
                                                            id={`edit-name-${event.id}`}
                                                            type="text"
                                                            class="h-12 w-full rounded-[16px] border border-[#e2e2e2] bg-white px-4 font-['Nunito'] text-[16px] text-[#333] outline-none transition focus:border-[#8b3ffc]"
                                                            bind:value={
                                                                editEventName
                                                            }
                                                        />
                                                    </div>
                                                    <div
                                                        class="grid gap-3 sm:grid-cols-2"
                                                    >
                                                        <div class="space-y-2">
                                                            <label
                                                                class="font-['Inter'] text-[13px] text-[#555]"
                                                                for={`edit-emoji-${event.id}`}
                                                            >
                                                                Emoji
                                                            </label>
                                                            <input
                                                                id={`edit-emoji-${event.id}`}
                                                                type="text"
                                                                maxlength="4"
                                                                class="h-12 w-full rounded-[16px] border border-[#e2e2e2] bg-white px-4 font-['Nunito'] text-[16px] text-[#333] outline-none transition focus:border-[#8b3ffc]"
                                                                bind:value={
                                                                    editEventEmoji
                                                                }
                                                            />
                                                        </div>
                                                        <div class="space-y-2">
                                                            <label
                                                                class="font-['Inter'] text-[13px] text-[#555]"
                                                                for={`edit-ends-${event.id}`}
                                                            >
                                                                Ends at
                                                            </label>
                                                            <input
                                                                id={`edit-ends-${event.id}`}
                                                                type="datetime-local"
                                                                class="h-12 w-full rounded-[16px] border border-[#e2e2e2] bg-white px-4 font-['Nunito'] text-[16px] text-[#333] outline-none transition focus:border-[#8b3ffc]"
                                                                bind:value={
                                                                    editEventEndsAt
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                    <div
                                                        class="flex flex-wrap gap-2"
                                                    >
                                                        <button
                                                            type="button"
                                                            class="rounded-[12px] border border-[#4dfb59] bg-[#e2ffdd] px-4 py-2 font-['Nunito'] text-[14px] font-bold text-[#1f4d22] transition hover:bg-[#d6f4c9]"
                                                            onclick={saveEventEdits}
                                                        >
                                                            Save changes
                                                        </button>
                                                        <button
                                                            type="button"
                                                            class="rounded-[12px] border border-[#e2e2e2] bg-white px-4 py-2 font-['Nunito'] text-[14px] font-bold text-[#555] transition hover:border-[#ccc]"
                                                            onclick={cancelEditEvent}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            {:else}
                                                <div
                                                    class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
                                                >
                                                    <div class="space-y-2">
                                                        <div
                                                            class="flex items-center gap-2"
                                                        >
                                                            {#if event.emoji}
                                                                <span
                                                                    class="text-[24px]"
                                                                    >{event.emoji}</span
                                                                >
                                                            {/if}
                                                            <h3
                                                                class="font-['Nunito'] font-black text-[20px] text-[#222]"
                                                            >
                                                                {event.name}
                                                            </h3>
                                                        </div>
                                                        {#if isSuperuser()}
                                                            <p
                                                                class="font-['Inter'] text-[13px] text-[#777]"
                                                            >
                                                                Council: <span
                                                                    class="font-semibold"
                                                                    >{getCouncilName(
                                                                        event.council_id,
                                                                    )}</span
                                                                >
                                                            </p>
                                                        {/if}
                                                        {#if event.ends_at}
                                                            <p
                                                                class="font-['Inter'] text-[13px] text-[#777]"
                                                            >
                                                                Ends {new Date(
                                                                    event.ends_at,
                                                                ).toLocaleString()}
                                                            </p>
                                                        {/if}
                                                        <p
                                                            class="font-['Inter'] text-[13px] text-[#777]"
                                                        >
                                                            Volunteers: {getVolunteersForEvent(
                                                                event.id,
                                                            ).length}
                                                        </p>
                                                    </div>
                                                    <div
                                                        class="flex flex-wrap gap-2"
                                                    >
                                                        <button
                                                            type="button"
                                                            class="rounded-[12px] border border-[#f2f2f2] bg-white px-4 py-2 font-['Nunito'] text-[13px] font-bold text-[#333] transition hover:border-[#ddd]"
                                                            onclick={() =>
                                                                toggleEventActive(
                                                                    event.id,
                                                                    event.is_active,
                                                                )}
                                                        >
                                                            {event.is_active
                                                                ? "Active"
                                                                : "Set active"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            class="rounded-[12px] border border-[#c7d7ff] bg-[#eef2ff] px-4 py-2 font-['Nunito'] text-[13px] font-bold text-[#2f42a0] transition hover:bg-[#e0e6ff]"
                                                            onclick={() =>
                                                                startEditEvent(
                                                                    event,
                                                                )}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            class="rounded-[12px] border border-[#ffd7d7] bg-[#fff0f0] px-4 py-2 font-['Nunito'] text-[13px] font-bold text-[#b63131] transition hover:bg-[#ffe0e0] disabled:opacity-50"
                                                            onclick={() =>
                                                                deleteEvent(
                                                                    event.id,
                                                                )}
                                                            disabled={deletingEvent ===
                                                                event.id}
                                                        >
                                                            {deletingEvent ===
                                                            event.id
                                                                ? "Deleting..."
                                                                : "Delete"}
                                                        </button>
                                                    </div>
                                                </div>
                                            {/if}

                                            <div class="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    class="rounded-[12px] border border-[#f2f2f2] bg-white px-4 py-2 font-['Nunito'] text-[13px] font-bold text-[#333] transition hover:border-[#ddd]"
                                                    onclick={() =>
                                                        (expandedEventId =
                                                            expandedEventId ===
                                                            event.id
                                                                ? null
                                                                : event.id)}
                                                >
                                                    {expandedEventId ===
                                                    event.id
                                                        ? "Hide volunteers"
                                                        : `View volunteers (${getVolunteersForEvent(event.id).length})`}
                                                </button>
                                                <button
                                                    type="button"
                                                    class="rounded-[12px] border border-[#4dfb59] bg-[#e2ffdd] px-4 py-2 font-['Nunito'] text-[13px] font-bold text-[#1f4d22] transition hover:bg-[#d6f4c9] disabled:opacity-50"
                                                    onclick={() =>
                                                        copyVolunteerNames(
                                                            event.id,
                                                        )}
                                                    disabled={copySuccess ===
                                                        event.id ||
                                                        getVolunteersForEvent(
                                                            event.id,
                                                        ).length === 0}
                                                >
                                                    {copySuccess === event.id
                                                        ? "Copied!"
                                                        : "Copy names"}
                                                </button>
                                                <button
                                                    type="button"
                                                    class="rounded-[12px] border border-[#8b3ffc] bg-[#f3e8ff] px-4 py-2 font-['Nunito'] text-[13px] font-bold text-[#3f1c88] transition hover:bg-[#eadeff] disabled:opacity-50"
                                                    onclick={() =>
                                                        createRandomPickerForEvent(
                                                            event,
                                                        )}
                                                    disabled={creatingWheelForEventId ===
                                                        event.id ||
                                                        getVolunteersForEvent(
                                                            event.id,
                                                        ).length === 0}
                                                    title="Create a random picker wheel using Wheel of Names"
                                                >
                                                    {creatingWheelForEventId ===
                                                    event.id
                                                        ? "Creating wheel..."
                                                        : "Random Picker"}
                                                </button>
                                            </div>

                                            {#if expandedEventId === event.id}
                                                {#if getVolunteersForEvent(event.id).length === 0}
                                                    <div
                                                        class="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-4 text-center"
                                                    >
                                                        <p
                                                            class="font-['Inter'] text-[13px] text-[#777]"
                                                        >
                                                            No submissions yet
                                                        </p>
                                                    </div>
                                                {:else}
                                                    <div
                                                        class="space-y-2 rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-4"
                                                    >
                                                        {#each getVolunteersForEvent(event.id) as volunteer (volunteer.id)}
                                                            <div
                                                                class="flex flex-col gap-1 rounded-lg bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                                            >
                                                                <div>
                                                                    <p
                                                                        class="font-['Nunito'] font-bold text-[15px] text-[#222]"
                                                                    >
                                                                        {volunteer.full_name}
                                                                    </p>
                                                                    <p
                                                                        class="font-['Inter'] text-[12px] text-[#777]"
                                                                    >
                                                                        {volunteer.has_volunteered_before
                                                                            ? "Has volunteered before"
                                                                            : "First time"}
                                                                    </p>
                                                                </div>
                                                                <p
                                                                    class="font-['Inter'] text-[12px] text-[#999]"
                                                                >
                                                                    {new Date(
                                                                        volunteer.created_at,
                                                                    ).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        {/each}
                                                    </div>
                                                {/if}
                                            {/if}
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    </section>

                    <aside class="space-y-6 xl:sticky xl:top-6">
                        {#if isSuperuser()}
                            <div
                                class="rounded-2xl border border-[#eaeaea] bg-white p-6 space-y-4"
                            >
                                <h2
                                    class="font-['Nunito'] font-black text-[20px] text-[#222]"
                                >
                                    Councils
                                </h2>
                                <div class="flex flex-col gap-3">
                                    <div class="flex gap-2">
                                        <input
                                            type="text"
                                            class="h-11 flex-1 rounded-[16px] border border-[#e2e2e2] bg-white px-4 font-['Nunito'] text-[15px] text-[#333] outline-none transition focus:border-[#8b3ffc]"
                                            placeholder="New council name"
                                            bind:value={newCouncilName}
                                            disabled={creatingCouncil}
                                        />
                                        <button
                                            type="button"
                                            class="rounded-[12px] border border-[#4dfb59] bg-[#e2ffdd] px-4 py-2 font-['Nunito'] text-[13px] font-bold text-[#1f4d22] transition hover:bg-[#d6f4c9] disabled:opacity-60"
                                            onclick={createCouncil}
                                            disabled={creatingCouncil ||
                                                !newCouncilName.trim()}
                                        >
                                            {creatingCouncil
                                                ? "Adding..."
                                                : "Add"}
                                        </button>
                                    </div>
                                    {#if councils.length === 0}
                                        <p
                                            class="font-['Inter'] text-[13px] text-[#777]"
                                        >
                                            No councils yet
                                        </p>
                                    {:else}
                                        <ul class="space-y-2">
                                            {#each councils as council (council.id)}
                                                <li
                                                    class="flex items-center justify-between rounded-lg border border-[#f2f2f2] bg-[#fafafa] px-4 py-3"
                                                >
                                                    <span
                                                        class="font-['Nunito'] text-[15px] text-[#333]"
                                                    >
                                                        {council.name}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        class="rounded-[10px] border border-[#ffd7d7] bg-[#fff0f0] px-3 py-1 font-['Nunito'] text-[12px] font-bold text-[#b63131] transition hover:bg-[#ffe0e0] disabled:opacity-50"
                                                        onclick={() =>
                                                            deleteCouncil(
                                                                council.id,
                                                            )}
                                                        disabled={deletingCouncil ===
                                                            council.id}
                                                    >
                                                        {deletingCouncil ===
                                                        council.id
                                                            ? "Deleting..."
                                                            : "Delete"}
                                                    </button>
                                                </li>
                                            {/each}
                                        </ul>
                                    {/if}
                                </div>
                            </div>

                            <div
                                class="rounded-2xl border border-[#eaeaea] bg-white p-6 space-y-4"
                            >
                                <h2
                                    class="font-['Nunito'] font-black text-[20px] text-[#222]"
                                >
                                    Admin accounts
                                </h2>

                                <div class="grid gap-3">
                                    <div class="space-y-2">
                                        <label
                                            class="font-['Inter'] text-[13px] text-[#555]"
                                            for="admin-email">Email</label
                                        >
                                        <input
                                            id="admin-email"
                                            type="email"
                                            class="h-11 w-full rounded-[16px] border border-[#e2e2e2] bg-white px-4 font-['Nunito'] text-[15px] text-[#333] outline-none transition focus:border-[#8b3ffc]"
                                            placeholder="council@example.com"
                                            bind:value={newAdminEmail}
                                            disabled={creatingAdmin}
                                        />
                                    </div>
                                    <div class="space-y-2">
                                        <label
                                            class="font-['Inter'] text-[13px] text-[#555]"
                                            for="admin-password">Password</label
                                        >
                                        <input
                                            id="admin-password"
                                            type="password"
                                            class="h-11 w-full rounded-[16px] border border-[#e2e2e2] bg-white px-4 font-['Nunito'] text-[15px] text-[#333] outline-none transition focus:border-[#8b3ffc]"
                                            bind:value={newAdminPassword}
                                            disabled={creatingAdmin}
                                        />
                                    </div>
                                    <div class="space-y-2">
                                        <label
                                            class="font-['Inter'] text-[13px] text-[#555]"
                                            for="admin-council">Council</label
                                        >
                                        <select
                                            id="admin-council"
                                            class="h-11 w-full rounded-[16px] border border-[#e2e2e2] bg-white px-4 font-['Nunito'] text-[15px] text-[#333] outline-none transition focus:border-[#8b3ffc]"
                                            bind:value={newAdminCouncilId}
                                            disabled={creatingAdmin}
                                        >
                                            <option value="" disabled
                                                >Select council</option
                                            >
                                            {#each councils as council (council.id)}
                                                <option value={council.id}
                                                    >{council.name}</option
                                                >
                                            {/each}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        class="mt-1 rounded-[12px] border border-[#4dfb59] bg-[#e2ffdd] px-4 py-2 font-['Nunito'] text-[13px] font-bold text-[#1f4d22] transition hover:bg-[#d6f4c9] disabled:opacity-60"
                                        onclick={createCouncilAdmin}
                                        disabled={creatingAdmin ||
                                            !newAdminEmail.trim() ||
                                            !newAdminPassword.trim() ||
                                            !newAdminCouncilId}
                                    >
                                        {creatingAdmin
                                            ? "Creating..."
                                            : "Create admin"}
                                    </button>
                                </div>

                                {#if allAdmins.length === 0}
                                    <p
                                        class="font-['Inter'] text-[13px] text-[#777]"
                                    >
                                        No admin accounts yet.
                                    </p>
                                {:else}
                                    <ul class="space-y-2">
                                        {#each allAdmins as admin (admin.id)}
                                            <li
                                                class="flex items-center justify-between rounded-lg border border-[#f2f2f2] bg-[#fafafa] px-4 py-3"
                                            >
                                                <div>
                                                    <p
                                                        class="font-['Nunito'] text-[15px] text-[#333]"
                                                    >
                                                        {admin.email}
                                                    </p>
                                                    <p
                                                        class="font-['Inter'] text-[12px] text-[#777]"
                                                    >
                                                        {admin.role ===
                                                        "superuser"
                                                            ? "Superuser"
                                                            : getCouncilName(
                                                                  admin.council_id,
                                                              )}
                                                    </p>
                                                </div>
                                                {#if admin.role !== "superuser"}
                                                    <button
                                                        type="button"
                                                        class="rounded-[10px] border border-[#ffd7d7] bg-[#fff0f0] px-3 py-1 font-['Nunito'] text-[12px] font-bold text-[#b63131] transition hover:bg-[#ffe0e0] disabled:opacity-50"
                                                        onclick={() =>
                                                            deleteCouncilAdmin(
                                                                admin.id,
                                                                admin.user_id,
                                                            )}
                                                        disabled={deletingAdmin ===
                                                            admin.id}
                                                    >
                                                        {deletingAdmin ===
                                                        admin.id
                                                            ? "Removing..."
                                                            : "Remove"}
                                                    </button>
                                                {/if}
                                            </li>
                                        {/each}
                                    </ul>
                                {/if}
                            </div>
                        {:else}
                            <div
                                class="rounded-2xl border border-[#eaeaea] bg-white p-6 space-y-3"
                            >
                                <h2
                                    class="font-['Nunito'] font-black text-[20px] text-[#222]"
                                >
                                    Your council
                                </h2>
                                {#if userCouncil}
                                    <p
                                        class="font-['Inter'] text-[15px] text-[#333]"
                                    >
                                        {userCouncil.name}
                                    </p>
                                    <p
                                        class="font-['Inter'] text-[13px] text-[#777]"
                                    >
                                        {events.length} events · {volunteers.length}
                                        volunteer submissions
                                    </p>
                                {:else}
                                    <p
                                        class="font-['Inter'] text-[14px] text-[#666]"
                                    >
                                        You aren't linked to a council yet. Ask
                                        a superuser to assign you.
                                    </p>
                                {/if}
                            </div>
                        {/if}
                    </aside>
                </div>
            {/if}
        </div>
    {/if}
    <p class="mt-6 text-center text-xs font-['Inter'] text-[#9a9a9a]">
        Admin v{APP_VERSION}
    </p>
</div>

<style>
    :global(body) {
        user-select: auto;
        -webkit-user-select: auto;
        -moz-user-select: auto;
        -ms-user-select: auto;
        overflow: auto;
        touch-action: auto;
        background-color: #fdfdfd;
    }
</style>
