<script lang="ts">
  import { supabase, type Event, type Volunteer } from "$lib/supabase";
  import { onMount } from "svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let events: Event[] = $state([]);
  let volunteers: Volunteer[] = $state([]);
  let loading = $state(true);
  let error = $state("");

  // Auth states
  let isAuthenticated = $state(false);
  let passwordInput = $state("");
  let authError = $state("");

  // Form states
  let newEventName = $state("");
  let newEventEmoji = $state("");
  let newEventEndsAt = $state("");

  // Edit states
  let editingEventId = $state<string | null>(null);
  let editEventName = $state("");
  let editEventEmoji = $state("");
  let editEventEndsAt = $state("");
  let copySuccess = $state<string | null>(null);

  onMount(async () => {
    // Check if already authenticated in session storage
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem("admin_authenticated");

      if (auth === "true") {
        isAuthenticated = true;
      }
    }

    if (isAuthenticated) {
      await loadEvents();
      await loadVolunteers();
      loading = false;
    } else {
      loading = false;
    }
  });

  async function handleLogin() {
    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: passwordInput,
        }),
      });
      const data = await response.json();

      if (data.success) {
        isAuthenticated = true;
        sessionStorage.setItem("admin_authenticated", "true");
        authError = "";
        loading = true;
        loadEvents()
          .then(() => loadVolunteers())
          .then(() => {
            loading = false;
          });
      } else {
        authError = data.error || "Incorrect password";
        passwordInput = "";
      }
    } catch (err) {
      authError = "Failed to connect to server";
      passwordInput = "";
    }
  }

  function handleLogout() {
    isAuthenticated = false;
    sessionStorage.removeItem("admin_authenticated");
    passwordInput = "";
  }

  async function loadEvents() {
    const { data, error: err } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (err) {
      error = err.message;
    } else {
      events = data || [];
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

  async function createEvent() {
    if (!newEventName.trim()) return;

    // Convert local datetime to ISO string in local timezone
    let endsAtISO = null;
    if (newEventEndsAt) {
      const localDate = new Date(newEventEndsAt);
      endsAtISO = localDate.toISOString();
    }

    const { error: err } = await supabase.from("events").insert({
      name: newEventName,
      emoji: newEventEmoji,
      ends_at: endsAtISO,
      is_active: false,
    });

    if (err) {
      error = err.message;
    } else {
      newEventName = "";
      newEventEmoji = "";
      newEventEndsAt = "";
      await loadEvents();
    }
  }

  async function toggleEventActive(eventId: string, currentStatus: boolean) {
    // First, deactivate all events
    await supabase
      .from("events")
      .update({ is_active: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    // Then activate the selected one if it was inactive
    if (!currentStatus) {
      const { error: err } = await supabase
        .from("events")
        .update({ is_active: true })
        .eq("id", eventId);

      if (err) {
        error = err.message;
      }
    }

    await loadEvents();
  }

  async function deleteEvent(eventId: string) {
    if (!confirm("Delete this event and all its volunteers?")) return;

    const { error: err } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

    if (err) {
      error = err.message;
    } else {
      await loadEvents();
      await loadVolunteers();
    }
  }

  function startEditEvent(event: Event) {
    editingEventId = event.id;
    editEventName = event.name;
    editEventEmoji = event.emoji || "";

    // Convert UTC datetime to local datetime-local format
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

  function cancelEdit() {
    editingEventId = null;
    editEventName = "";
    editEventEmoji = "";
    editEventEndsAt = "";
  }

  async function saveEdit() {
    if (!editingEventId || !editEventName.trim()) return;

    let endsAtISO = null;
    if (editEventEndsAt) {
      const localDate = new Date(editEventEndsAt);
      endsAtISO = localDate.toISOString();
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
    } else {
      cancelEdit();
      await loadEvents();
    }
  }

  function getVolunteersForEvent(eventId: string) {
    return volunteers.filter((v) => v.event_id === eventId);
  }

  async function copyVolunteerNames(eventId: string) {
    const eventVolunteers = getVolunteersForEvent(eventId);
    const names = eventVolunteers.map((v) => v.full_name).join("\n");

    if (!names) {
      error = "No volunteers to copy";
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(names);
        copySuccess = eventId;
        setTimeout(() => {
          copySuccess = null;
        }, 2000);
      } else {
        // Fallback for older browsers or insecure contexts
        const textarea = document.createElement("textarea");
        textarea.value = names;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        copySuccess = eventId;
        setTimeout(() => {
          copySuccess = null;
        }, 2000);
      }
    } catch (err) {
      error = "Failed to copy to clipboard. Try using HTTPS.";
    }
  }
</script>

<div class="space-y-8">
  {#if !isAuthenticated}
    <!-- Login Screen -->
    <div class="max-w-md mx-auto pt-12">
      <div class="text-center mb-10">
        <div class="mb-4">
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
        </div>
        <h1
          class="font-['Nunito'] font-black text-[28px] leading-none tracking-[-0.02em] text-[#020202]"
        >
          Admin Access
        </h1>
        <p class="font-['Inter'] text-[15px] text-[#666] mt-3">
          Enter password to manage events
        </p>
      </div>

      <form
        class="rounded-xl border-[3px] border-[#f2f2f2] border-b-[5px] bg-white p-8 space-y-5"
        onsubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
      >
        {#if authError}
          <div class="rounded-lg border-[2px] border-red-400 bg-red-50 p-3">
            <p class="font-['Inter'] text-[13px] text-red-700 text-center">
              {authError}
            </p>
          </div>
        {/if}

        <div>
          <label
            for="password"
            class="block font-['Inter'] text-[13px] font-medium text-[#555] mb-2"
            >Password</label
          >
          <input
            id="password"
            type="password"
            placeholder="•••••••••"
            class="h-14 w-full rounded-[73px] border-[3px] border-[#f2f2f2] bg-white px-6 font-['Nunito'] text-[16px] text-[#333] placeholder:opacity-20 outline-none focus:border-[#fba24d] transition-colors"
            bind:value={passwordInput}
          />
        </div>

        <button
          type="submit"
          class="w-full h-14 rounded-[73px] border-[3px] border-[#4dfb59] bg-[#e2ffdd] px-6 font-['Nunito'] font-black text-[17px] text-[#333] hover:bg-[#d4f5cc] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#e2ffdd] disabled:active:scale-100"
          disabled={!passwordInput.trim()}
        >
          Unlock Dashboard
        </button>
      </form>

      <div class="text-center pt-10">
        <a
          href="/"
          class="font-['Inter'] text-[13px] text-[#999] hover:text-[#333] transition-colors inline-flex items-center gap-1"
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
    <!-- Admin Dashboard -->
    <div class="flex items-start justify-between gap-4 mb-8">
      <div>
        <h1
          class="font-['Nunito'] font-black text-[32px] leading-none tracking-[-0.02em] text-[#020202]"
        >
          Dashboard
        </h1>
        <p class="font-['Inter'] text-[14px] text-[#999] mt-2">
          Ok i hope yk what ur doing.
        </p>
      </div>
      <button
        type="button"
        class="h-10 px-5 rounded-[73px] border-[2px] border-[#f2f2f2] bg-white font-['Nunito'] font-bold text-[13px] text-[#666] hover:border-[#e5e5e5] hover:text-[#333] transition-colors"
        onclick={handleLogout}
      >
        Logout
      </button>
    </div>

    {#if error}
      <div class="rounded-xl border-[3px] border-red-400 bg-red-50 p-4">
        <p class="font-['Inter'] text-[14px] text-red-700">{error}</p>
      </div>
    {/if}

    {#if loading}
      <div class="text-center py-12">
        <p class="font-['Inter'] text-[16px] text-[#666]">Loading...</p>
      </div>
    {:else}
      <!-- Create Event Form -->
      <div
        class="rounded-xl border-[3px] border-[#f2f2f2] border-b-[5px] bg-white p-7 space-y-5"
      >
        <div>
          <h2 class="font-['Nunito'] font-black text-[20px] text-[#333]">
            Create New Event
          </h2>
          <p class="font-['Inter'] text-[13px] text-[#999] mt-1">
            Add a new volunteer opportunity
          </p>
        </div>

        <div class="space-y-3">
          <div>
            <label
              for="event-name"
              class="block font-['Inter'] text-[14px] text-[#333] mb-2"
              >Event Name</label
            >
            <input
              id="event-name"
              type="text"
              placeholder="e.g., Our first BBT sale"
              class="h-12 w-full rounded-[73px] border-[3px] border-[#f2f2f2] bg-white px-6 font-['Nunito'] text-[16px] text-[#333] placeholder:opacity-30 outline-none focus:border-neutral-400"
              bind:value={newEventName}
            />
          </div>

          <div>
            <label
              for="event-emoji"
              class="block font-['Inter'] text-[14px] text-[#333] mb-2"
              >Icon/Emoji (optional)</label
            >
            <input
              id="event-emoji"
              type="text"
              placeholder="e.g., 🧋"
              class="h-12 w-full rounded-[73px] border-[3px] border-[#f2f2f2] bg-white px-6 font-['Nunito'] text-[16px] text-[#333] placeholder:opacity-30 outline-none focus:border-neutral-400"
              bind:value={newEventEmoji}
            />
          </div>

          <div>
            <label
              for="event-ends"
              class="block font-['Inter'] text-[14px] text-[#333] mb-2"
              >Ends At (optional)</label
            >
            <input
              id="event-ends"
              type="datetime-local"
              class="h-12 w-full rounded-[73px] border-[3px] border-[#f2f2f2] bg-white px-6 font-['Nunito'] text-[16px] text-[#333] outline-none focus:border-neutral-400"
              bind:value={newEventEndsAt}
            />
          </div>

          <button
            type="button"
            class="w-full h-12 rounded-[73px] border-[3px] border-[#4dfb59] bg-[#e2ffdd] px-6 font-['Nunito'] font-black text-[16px] text-[#333] hover:bg-[#d4f5cc] transition disabled:opacity-50 disabled:cursor-not-allowed"
            onclick={createEvent}
            disabled={!newEventName.trim()}
          >
            Create Event
          </button>
        </div>
      </div>

      <!-- Events List -->
      <div class="space-y-5">
        <div class="flex items-baseline justify-between">
          <h2 class="font-['Nunito'] font-black text-[22px] text-[#333]">
            All Events
          </h2>
          <span class="font-['Inter'] text-[13px] text-[#999]"
            >{events.length} total</span
          >
        </div>

        {#if events.length === 0}
          <div
            class="rounded-xl border-[3px] border-[#f2f2f2] bg-white p-12 text-center"
          >
            <div class="mb-3">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                class="mx-auto text-[#ddd]"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="18"
                  rx="2"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M3 10h18M8 14h8"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </div>
            <p class="font-['Nunito'] font-bold text-[16px] text-[#999]">
              No events yet
            </p>
            <p class="font-['Inter'] text-[13px] text-[#bbb] mt-1">
              Create your first event above to get started
            </p>
          </div>
        {:else}
          {#each events as event (event.id)}
            <div
              class="rounded-xl border-[3px] border-[#f2f2f2] border-b-[5px] bg-white p-6 space-y-4"
            >
              {#if editingEventId === event.id}
                <!-- Edit Mode -->
                <div class="space-y-4">
                  <h3 class="font-['Nunito'] font-bold text-[18px] text-[#333]">
                    Edit Event
                  </h3>

                  <div class="space-y-3">
                    <div>
                      <label
                        for="edit-event-name"
                        class="block font-['Inter'] text-[14px] text-[#333] mb-2"
                        >Event Name</label
                      >
                      <input
                        id="edit-event-name"
                        type="text"
                        class="h-12 w-full rounded-[73px] border-[3px] border-[#f2f2f2] bg-white px-6 font-['Nunito'] text-[16px] text-[#333] outline-none focus:border-neutral-400"
                        bind:value={editEventName}
                      />
                    </div>

                    <div>
                      <label
                        for="edit-event-emoji"
                        class="block font-['Inter'] text-[14px] text-[#333] mb-2"
                        >Icon/Emoji</label
                      >
                      <input
                        id="edit-event-emoji"
                        type="text"
                        class="h-12 w-full rounded-[73px] border-[3px] border-[#f2f2f2] bg-white px-6 font-['Nunito'] text-[16px] text-[#333] outline-none focus:border-neutral-400"
                        bind:value={editEventEmoji}
                      />
                    </div>

                    <div>
                      <label
                        for="edit-event-ends"
                        class="block font-['Inter'] text-[14px] text-[#333] mb-2"
                        >Ends At</label
                      >
                      <input
                        id="edit-event-ends"
                        type="datetime-local"
                        class="h-12 w-full rounded-[73px] border-[3px] border-[#f2f2f2] bg-white px-6 font-['Nunito'] text-[16px] text-[#333] outline-none focus:border-neutral-400"
                        bind:value={editEventEndsAt}
                      />
                    </div>

                    <div class="flex gap-2 pt-2">
                      <button
                        type="button"
                        class="h-10 px-6 rounded-[73px] border-[3px] border-[#4dfb59] bg-[#e2ffdd] font-['Nunito'] font-bold text-[14px] text-[#333] hover:bg-[#d4f5cc] transition"
                        onclick={saveEdit}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        class="h-10 px-6 rounded-[73px] border-[3px] border-[#f2f2f2] bg-white font-['Nunito'] font-bold text-[14px] text-[#333] hover:bg-[#f8f8f8] transition"
                        onclick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              {:else}
                <!-- View Mode -->
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      {#if event.emoji}
                        <span class="text-[24px]">{event.emoji}</span>
                      {/if}
                      <h3
                        class="font-['Nunito'] font-black text-[20px] text-[#333] truncate"
                      >
                        {event.name}
                      </h3>
                    </div>

                    <div class="mt-2 space-y-1">
                      <p class="font-['Inter'] text-[14px] text-[#666]">
                        Status:
                        <span
                          class="font-semibold {event.is_active
                            ? 'text-green-600'
                            : 'text-gray-500'}"
                        >
                          {event.is_active ? "Active" : "Inactive"}
                        </span>
                      </p>
                      {#if event.ends_at}
                        <p class="font-['Inter'] text-[14px] text-[#666]">
                          Ends: {new Date(event.ends_at).toLocaleString()}
                        </p>
                      {/if}
                      <p class="font-['Inter'] text-[14px] text-[#666]">
                        Volunteers: {getVolunteersForEvent(event.id).length}
                      </p>
                    </div>
                  </div>

                  <div class="flex flex-col gap-2">
                    <button
                      type="button"
                      class="h-10 px-4 rounded-[73px] border-[3px] {event.is_active
                        ? 'border-[#fba24d] bg-[#ffeedd]'
                        : 'border-[#f2f2f2] bg-white'} font-['Nunito'] font-bold text-[14px] text-[#333] hover:opacity-80 transition"
                      onclick={() =>
                        toggleEventActive(event.id, event.is_active)}
                    >
                      {event.is_active ? "Deactivate" : "Activate"}
                    </button>

                    <button
                      type="button"
                      class="h-10 px-4 rounded-[73px] border-[3px] border-blue-300 bg-blue-50 font-['Nunito'] font-bold text-[14px] text-blue-700 hover:bg-blue-100 transition"
                      onclick={() => startEditEvent(event)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      class="h-10 px-4 rounded-[73px] border-[3px] border-red-300 bg-red-50 font-['Nunito'] font-bold text-[14px] text-red-700 hover:bg-red-100 transition"
                      onclick={() => deleteEvent(event.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              {/if}

              <!-- Volunteers for this event -->
              {#if getVolunteersForEvent(event.id).length > 0}
                <div class="border-t-[2px] border-[#f2f2f2] pt-4 space-y-2">
                  <div class="flex items-center justify-between">
                    <p
                      class="font-['Nunito'] font-bold text-[16px] text-[#333]"
                    >
                      Submitted Volunteers:
                    </p>
                    <button
                      type="button"
                      class="h-8 px-4 rounded-[73px] border-[3px] {copySuccess ===
                      event.id
                        ? 'border-[#4dfb59] bg-[#e2ffdd]'
                        : 'border-[#f2f2f2] bg-white'} font-['Nunito'] font-bold text-[12px] text-[#333] hover:opacity-80 transition"
                      onclick={() => copyVolunteerNames(event.id)}
                    >
                      {copySuccess === event.id ? "Copied!" : "Copy Names"}
                    </button>
                  </div>
                  <div class="space-y-2 max-h-64 overflow-y-auto">
                    {#each getVolunteersForEvent(event.id) as volunteer (volunteer.id)}
                      <div
                        class="flex items-center justify-between p-3 rounded-lg bg-[#f8f8f8]"
                      >
                        <div>
                          <p
                            class="font-['Nunito'] font-bold text-[14px] text-[#333]"
                          >
                            {volunteer.full_name}
                          </p>
                          <p class="font-['Inter'] text-[12px] text-[#666]">
                            {volunteer.has_volunteered_before
                              ? "Has volunteered before"
                              : "First time"}
                          </p>
                        </div>
                        <p class="font-['Inter'] text-[12px] text-[#999]">
                          {new Date(volunteer.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>

      <div class="text-center pt-8 border-t-[2px] border-[#f2f2f2]">
        <a
          href="/"
          class="font-['Inter'] text-[14px] text-[#666] hover:text-[#333] underline"
        >
          ← Back to volunteer form
        </a>
      </div>
    {/if}
  {/if}
</div>

<style>
  :global(body) {
    user-select: auto;
    -webkit-user-select: auto;
    -moz-user-select: auto;
    -ms-user-select: auto;
    overflow: auto;
    touch-action: auto;
  }
</style>
