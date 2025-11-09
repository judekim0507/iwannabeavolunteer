<script lang="ts">
  import { supabase, type Event, type Council } from "$lib/supabase";
  import { onMount } from "svelte";

  let fullName = $state("");
  let hasVolunteeredBefore = $state<boolean | null>(null);
  let activeEvent = $state<Event | null>(null);
  let councils = $state<Council[]>([]);
  let selectedCouncilId = $state("");
  let loading = $state(true);
  let isEventLoading = $state(false);
  let submitting = $state(false);
  let submitted = $state(false);
  let error = $state("");
  let isDuplicate = $state(false);
  let isExpired = $state(false);
  let currentTime = $state(new Date());

  onMount(() => {
    // Load selected council from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selected_council_id");
      if (saved) {
        selectedCouncilId = saved;
      }
    }

    let cancelled = false;

    (async () => {
      await loadCouncils();

      if (cancelled) return;

      let destinationId = selectedCouncilId;

      if (
        (!destinationId ||
          !councils.some((council) => council.id === destinationId)) &&
        councils.length > 0
      ) {
        destinationId = councils[0].id;
      }

      await selectCouncil(destinationId);

      if (!cancelled) {
        loading = false;
      }
    })();

    // Update time every second for countdown and progress bar
    const interval = setInterval(() => {
      currentTime = new Date();

      // Check if event has expired
      if (activeEvent?.ends_at) {
        const end = new Date(activeEvent.ends_at);
        if (currentTime.getTime() >= end.getTime()) {
          isExpired = true;
        }
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  });

  async function loadCouncils() {
    const { data, error: err } = await supabase
      .from("councils")
      .select("*")
      .order("name", { ascending: true });

    if (err) {
      error = err.message;
    } else {
      councils = data || [];
      // Auto-select first council if none selected
      if (!selectedCouncilId && councils.length > 0) {
        selectedCouncilId = councils[0].id;
        if (typeof window !== "undefined") {
          localStorage.setItem("selected_council_id", selectedCouncilId);
        }
      }
    }
  }

  let eventLoadTicket = 0;

  async function selectCouncil(councilId: string) {
    const nextId = councilId ?? "";
    const previousId = selectedCouncilId;

    selectedCouncilId = nextId;

    if (typeof window !== "undefined") {
      if (nextId) {
        localStorage.setItem("selected_council_id", nextId);
      } else {
        localStorage.removeItem("selected_council_id");
      }
    }

    if (!nextId) {
      activeEvent = null;
      isExpired = false;
      if (previousId) {
        fullName = "";
        hasVolunteeredBefore = null;
        submitted = false;
        isDuplicate = false;
        error = "";
      }
      isEventLoading = false;
      return;
    }

    const ticket = ++eventLoadTicket;
    isEventLoading = true;
    error = "";
    try {
      await loadActiveEvent();
    } finally {
      if (ticket === eventLoadTicket) {
        isEventLoading = false;
        if (previousId !== nextId) {
          fullName = "";
          hasVolunteeredBefore = null;
          submitted = false;
          isDuplicate = false;
        }
      }
    }
  }

  async function loadActiveEvent() {
    if (!selectedCouncilId) {
      activeEvent = null;
      return;
    }

    const { data, error: err } = await supabase
      .from("events")
      .select("*")
      .eq("is_active", true)
      .eq("council_id", selectedCouncilId)
      .single();

    if (err && err.code !== "PGRST116") {
      error = err.message;
    } else {
      activeEvent = data;
      isExpired = false;

      // Check if already expired on load
      if (data?.ends_at) {
        const end = new Date(data.ends_at);
        if (new Date().getTime() >= end.getTime()) {
          isExpired = true;
        }
      }
    }
  }

  async function onSubmit() {
    if (!activeEvent || !fullName.trim() || hasVolunteeredBefore === null)
      return;

    submitting = true;
    error = "";

    // Check for duplicate name
    const { data: existingVolunteers, error: checkErr } = await supabase
      .from("volunteers")
      .select("full_name")
      .eq("event_id", activeEvent.id)
      .ilike("full_name", fullName.trim());

    if (checkErr) {
      error = checkErr.message;
      submitting = false;
      return;
    }

    if (existingVolunteers && existingVolunteers.length > 0) {
      isDuplicate = true;
      submitting = false;
      return;
    }

    const { error: err } = await supabase.from("volunteers").insert({
      event_id: activeEvent.id,
      full_name: fullName.trim(),
      has_volunteered_before: hasVolunteeredBefore,
    });

    submitting = false;

    if (err) {
      error = err.message;
    } else {
      submitted = true;
      fullName = "";
      hasVolunteeredBefore = null;
    }
  }

  function calculateTimeRemaining() {
    if (!activeEvent?.ends_at) return null;

    const end = new Date(activeEvent.ends_at);
    const diff = end.getTime() - currentTime.getTime();

    if (diff <= 0) return "Ended";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }

  function calculateProgress() {
    if (!activeEvent?.ends_at) return 0;

    const end = new Date(activeEvent.ends_at);
    const start = new Date(activeEvent.created_at);

    const total = end.getTime() - start.getTime();
    const remaining = end.getTime() - currentTime.getTime();

    // Progress bar decreases from 100% to 0% as time runs out
    const progress = (remaining / total) * 100;
    return Math.min(100, Math.max(0, progress));
  }
</script>

<main class="w-full h-full">
  <div class="mx-auto max-w-md">
    {#if loading}
      <div class="space-y-8 animate-pulse">
        <div class="flex items-center gap-4">
          <div class="h-5 w-28 bg-neutral-200 rounded"></div>
          <div class="h-[14px] flex-1 bg-neutral-200 rounded-full"></div>
        </div>

        <div class="h-8 w-64 bg-neutral-200 rounded"></div>

        <div class="space-y-4">
          <div class="h-4 w-40 bg-neutral-200 rounded"></div>
          <div class="h-16 w-full bg-neutral-200 rounded-[73px]"></div>
        </div>

        <div class="space-y-4">
          <div class="h-4 w-56 bg-neutral-200 rounded"></div>
          <div class="flex gap-2">
            <div class="h-16 flex-1 bg-neutral-200 rounded-[73px]"></div>
            <div class="h-16 flex-1 bg-neutral-200 rounded-[73px]"></div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="h-4 w-32 bg-neutral-200 rounded"></div>
          <div class="h-16 w-full bg-neutral-200 rounded-[73px]"></div>
        </div>

        <div class="space-y-3 text-center">
          <div class="h-16 w-full bg-neutral-200 rounded-[73px]"></div>
        </div>
      </div>
    {:else}
      <section
        class="space-y-8 transition-opacity duration-200"
        class:opacity-60={isEventLoading}
        class:pointer-events-none={isEventLoading}
        aria-busy={isEventLoading}
      >
        {#if error}
          <div class="rounded-xl border-[3px] border-red-400 bg-red-50 p-4">
            <p class="font-['Inter'] text-[14px] text-red-700">{error}</p>
          </div>
        {/if}

        {#if councils.length === 0}
          <div
            class="rounded-xl border-[3px] border-[#f2f2f2] bg-white p-6 text-center"
          >
            <p class="font-['Nunito'] font-bold text-[16px] text-[#666]">
              Councils are being set up. Check back soon!
            </p>
          </div>
        {:else}
          {#if isEventLoading}{/if}

          <!-- Status/messages area now moved below title+dropdown -->

          <!-- Title -->
          {#if activeEvent?.ends_at}
            <div class="flex items-center gap-3">
              <p
                class="font-['Nunito'] font-bold text-[#333] opacity-70 tracking-[-0.02em] text-[16px] whitespace-nowrap"
              >
                Ends in {calculateTimeRemaining()}
              </p>
              <div class="inline-grid leading-none flex-1">
                <div class="bg-[#f2f2f2] h-[14px] w-full rounded-[36px]"></div>
                <div
                  class="h-[14px] -mt-[14px] rounded-[36px] bg-[#8b3ffc] transition-all duration-300"
                  style="width: {calculateProgress()}%"
                ></div>
              </div>
            </div>
          {/if}

          <button
            type="button"
            class="font-['Nunito'] font-black text-[32px] leading-none tracking-[-0.02em] text-[#020202] cursor-pointer bg-transparent border-0 p-0 text-left"
            ontouchstart={(e) => {
              let timer: NodeJS.Timeout;
              function clear() {
                if (timer) clearTimeout(timer);
              }
              timer = setTimeout(() => {
                window.location.href = "/admin";
              }, 1200);
              const up: EventListener = () => {
                clear();
                window.removeEventListener("touchend", up);
                window.removeEventListener("touchcancel", up);
              };
              window.addEventListener("touchend", up);
              window.addEventListener("touchcancel", up);
            }}
            onmousedown={(e) => {
              let timer: NodeJS.Timeout;
              function clear() {
                if (timer) clearTimeout(timer);
              }
              timer = setTimeout(() => {
                window.location.href = "/admin";
              }, 1200);
              const up: EventListener = () => {
                clear();
                window.removeEventListener("mouseup", up);
                window.removeEventListener("mouseleave", up);
              };
              window.addEventListener("mouseup", up);
              window.addEventListener("mouseleave", up);
            }}
            style="touch-action:manipulation;user-select:none;-webkit-user-select:none;"
            title="Long press to enter admin"
          >
            I wanna be a volunteer
          </button>

          <!-- Council Dropdown (Orange) -->
          {#if councils.length === 0}
            <div
              class="rounded-xl border-[3px] border-[#f2f2f2] bg-white p-6 text-center"
            >
              <p class="font-['Nunito'] font-bold text-[16px] text-[#666]">
                Councils are being set up. Check back soon!
              </p>
            </div>
          {:else}
            <div class="space-y-3 mt-2">
              <p
                class="font-['Inter'] text-[16px] tracking-[-0.02em] text-[#333]"
              >
                Which council are you with?
              </p>
              <div class="relative">
                <label for="council-select" class="sr-only"
                  >Choose your council</label
                >
                <select
                  id="council-select"
                  class="h-16 w-full appearance-none rounded-[73px] border-[3px] border-[#fba24d] border-b-[5px] bg-[#ffeedd] px-6 font-['Nunito'] text-[18px] tracking-[-0.02em] text-[#333] outline-none transition focus:border-[#fba24d] disabled:opacity-60"
                  bind:value={selectedCouncilId}
                  disabled={isEventLoading}
                  onchange={async (event) => {
                    const value = (event.currentTarget as HTMLSelectElement)
                      .value;
                    await selectCouncil(value);
                  }}
                >
                  <option value="">Select your council</option>
                  {#each councils as council (council.id)}
                    <option value={council.id}>{council.name}</option>
                  {/each}
                </select>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  class="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 text-[#fba24d]"
                  aria-hidden="true"
                >
                  <path
                    d="M5 7l5 6 5-6"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
            </div>

            {#if isEventLoading}{/if}
          {/if}

          {#if submitted}
            <div
              class="rounded-xl border-[3px] border-[#4dfb59] bg-[#e2ffdd] p-8 space-y-4 text-center"
            >
              <span class="text-[48px]">🍀</span>
              <h2 class="font-['Nunito'] font-black text-[28px] text-[#333]">
                You're in!
              </h2>
              <p class="font-['Inter'] text-[16px] text-[#666]">
                Your application has been submitted successfully.
              </p>
              <button
                type="button"
                class="mx-auto mt-2 inline-flex h-12 items-center justify-center rounded-[73px] border-[3px] border-[#f2f2f2] bg-white px-6 font-['Nunito'] font-bold text-[16px] text-[#333] hover:bg-[#f8f8f8] transition"
                onclick={() => (submitted = false)}
              >
                Submit another response
              </button>
            </div>
          {:else if isDuplicate}
            <div
              class="rounded-xl border-[3px] border-[#fba24d] bg-[#fff4e6] p-8 space-y-4 text-center"
            >
              <span class="text-[48px]">⚠️</span>
              <h2 class="font-['Nunito'] font-black text-[28px] text-[#333]">
                Already submitted!
              </h2>
              <p class="font-['Inter'] text-[16px] text-[#666]">
                This name has already been submitted for this event.
              </p>
              <button
                type="button"
                class="mx-auto mt-2 inline-flex h-12 items-center justify-center rounded-[73px] border-[3px] border-[#f2f2f2] bg-white px-6 font-['Nunito'] font-bold text-[16px] text-[#333] hover:bg-[#f8f8f8] transition"
                onclick={() => {
                  isDuplicate = false;
                  fullName = "";
                  hasVolunteeredBefore = null;
                }}
              >
                Try a different name
              </button>
            </div>
          {:else if isExpired}
            <div
              class="rounded-xl border-[3px] border-[#f2f2f2] bg-white p-8 space-y-4 text-center"
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                class="mx-auto text-[#ccc]"
                aria-hidden="true"
              >
                <path
                  d="M6 7V5a1 1 0 0 1 1-1h2M15 4h2a1 1 0 0 1 1 1v2M18 17v2a1 1 0 0 1-1 1h-2M9 20H7a1 1 0 0 1-1-1v-2"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <rect
                  x="3"
                  y="7"
                  width="18"
                  height="10"
                  rx="2"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
                <path
                  d="M12 10v3"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
              <h2 class="font-['Nunito'] font-black text-[28px] text-[#333]">
                Registration closed
              </h2>
              <p class="font-['Inter'] text-[16px] text-[#666]">
                This event has ended. Check back later for new opportunities!
              </p>
            </div>
          {:else if !activeEvent}
            <div
              class="rounded-xl border-[3px] border-[#f2f2f2] bg-white p-8 space-y-4 text-center"
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                class="mx-auto text-[#ccc]"
                aria-hidden="true"
              >
                <path
                  d="M12 20.25s-7.5-4.2-7.5-9.3A4.5 4.5 0 0 1 12 8.1a4.5 4.5 0 0 1 7.5 2.85c0 5.1-7.5 9.3-7.5 9.3Z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <h2 class="font-['Nunito'] font-black text-[24px] text-[#333]">
                No active event yet
              </h2>
              <p class="font-['Inter'] text-[16px] text-[#666]">
                Check back later when registration opens!
              </p>
            </div>
          {:else}
            <div class="space-y-4">
              <p
                class="font-['Inter'] text-[16px] tracking-[-0.02em] text-[#333]"
              >
                You are applying for...
              </p>
              <div class="flex justify-center">
                <div
                  class="w-full h-16 rounded-[73px] border-[3px] border-[#fba24d] bg-[#ffeedd] px-[44px] flex items-center justify-center gap-2 text-[#333] cursor-pointer"
                >
                  {#if activeEvent.emoji}
                    <span class="text-[22px]">{activeEvent.emoji}</span>
                  {:else}
                    <span class="text-[22px]"></span>
                  {/if}
                  <span
                    class="font-['Nunito'] font-black text-[18px] tracking-[-0.02em]"
                    >{activeEvent.name}</span
                  >
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <p
                class="font-['Inter'] text-[16px] tracking-[-0.02em] text-[#333]"
              >
                Have you been selected as a volunteer before?
              </p>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="h-16 flex-1 rounded-[73px] border-[3px] cursor-pointer outline-none {hasVolunteeredBefore ===
                  true
                    ? 'border-[#fba24d] bg-[#ffeedd]'
                    : 'border-[#f2f2f2] border-b-[5px] bg-white'} px-[44px] font-['Nunito'] font-black text-[18px] text-[#333] hover:opacity-80 transition"
                  onclick={() => (hasVolunteeredBefore = true)}
                >
                  Yes
                </button>
                <button
                  type="button"
                  class="h-16 flex-1 rounded-[73px] border-[3px] cursor-pointer outline-none {hasVolunteeredBefore ===
                  false
                    ? 'border-[#fba24d] bg-[#ffeedd]'
                    : 'border-[#f2f2f2] border-b-[5px] bg-white'} px-[44px] font-['Nunito'] font-black text-[18px] text-[#333] hover:opacity-80 transition"
                  onclick={() => (hasVolunteeredBefore = false)}
                >
                  No
                </button>
              </div>
            </div>

            <div class="space-y-4">
              <p
                class="font-['Inter'] text-[16px] tracking-[-0.02em] text-[#333]"
              >
                What is your name?
              </p>
              <div class="w-full">
                <label for="full-name" class="sr-only">Your name</label>
                <input
                  id="full-name"
                  type="text"
                  placeholder="Your name"
                  class="h-16 w-full rounded-[73px] border-[3px] {fullName.trim()
                    ? 'border-[#fba24d] bg-[#ffeedd]'
                    : 'border-[#f2f2f2] bg-white'} border-b-[5px] px-6 font-['Nunito'] text-[18px] tracking-[-0.02em] text-[#333] placeholder:opacity-30 outline-none transition-all duration-200"
                  bind:value={fullName}
                />
              </div>
            </div>

            <div class="space-y-3 text-center">
              <button
                type="button"
                class="w-full h-16 rounded-[73px] border-[3px] border-[#4dfb59] bg-[#e2ffdd] px-[44px] flex items-center justify-center gap-2 text-[#333] font-['Nunito'] font-black text-[18px] hover:bg-[#d4f5cc] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer outline-none"
                onclick={onSubmit}
                disabled={!fullName.trim() ||
                  hasVolunteeredBefore === null ||
                  submitting ||
                  isEventLoading}
                aria-disabled={!fullName.trim() ||
                  hasVolunteeredBefore === null ||
                  submitting ||
                  isEventLoading}
              >
                <span class="text-[22px]">🍀</span>
                <span>{submitting ? "Submitting..." : "Submit!"}</span>
              </button>

              <p class="font-['Inter'] text-[14px] text-[#999]">
                Built by <a
                  href="https://www.judekim.ca/"
                  class="underline hover:text-[#333]">Jude Kim</a
                > at BNSS.
              </p>
            </div>
          {/if}
        {/if}
      </section>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    scrollbar-width: none;
  }

  :global(body)::-webkit-scrollbar {
    display: none;
  }
</style>
