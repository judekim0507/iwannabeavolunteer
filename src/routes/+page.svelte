<script lang="ts">
  import { supabase, type Event } from "$lib/supabase";
  import { onMount } from "svelte";

  let fullName = $state("");
  let hasVolunteeredBefore = $state<boolean | null>(null);
  let activeEvent = $state<Event | null>(null);
  let loading = $state(true);
  let submitting = $state(false);
  let submitted = $state(false);
  let error = $state("");
  let isDuplicate = $state(false);
  let isExpired = $state(false);
  let currentTime = $state(new Date());

  onMount(() => {
    loadActiveEvent().then(() => {
      loading = false;
    });

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

    return () => clearInterval(interval);
  });

  async function loadActiveEvent() {
    const { data, error: err } = await supabase
      .from("events")
      .select("*")
      .eq("is_active", true)
      .single();

    if (err && err.code !== "PGRST116") {
      error = err.message;
    } else {
      activeEvent = data;

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
  {#if loading}
    <div class="space-y-8 animate-pulse">
      <!-- Shimmer countdown -->
      <div class="flex items-center gap-4">
        <div class="h-5 w-28 bg-neutral-200 rounded"></div>
        <div class="h-[14px] flex-1 bg-neutral-200 rounded-full"></div>
      </div>

      <!-- Shimmer title -->
      <div class="h-8 w-64 bg-neutral-200 rounded"></div>

      <!-- Shimmer event pill -->
      <div class="space-y-4">
        <div class="h-4 w-40 bg-neutral-200 rounded"></div>
        <div class="h-16 w-full bg-neutral-200 rounded-[73px]"></div>
      </div>

      <!-- Shimmer yes/no -->
      <div class="space-y-4">
        <div class="h-4 w-56 bg-neutral-200 rounded"></div>
        <div class="flex gap-2">
          <div class="h-16 flex-1 bg-neutral-200 rounded-[73px]"></div>
          <div class="h-16 flex-1 bg-neutral-200 rounded-[73px]"></div>
        </div>
      </div>

      <!-- Shimmer name input -->
      <div class="space-y-4">
        <div class="h-4 w-32 bg-neutral-200 rounded"></div>
        <div class="h-16 w-full bg-neutral-200 rounded-[73px]"></div>
      </div>

      <!-- Shimmer submit -->
      <div class="space-y-3 text-center">
        <div class="h-16 w-full bg-neutral-200 rounded-[73px]"></div>
      </div>
    </div>
  {:else if !activeEvent}
    <div class="text-center py-12 space-y-4">
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
  {:else if isExpired}
    <div class="text-center py-12 space-y-4">
      <span class="text-[64px]">⏰</span>
      <h2 class="font-['Nunito'] font-black text-[28px] text-[#333]">
        Registration closed
      </h2>
      <p class="font-['Inter'] text-[16px] text-[#666]">
        This event has ended. Check back later for new opportunities!
      </p>
    </div>
  {:else if isDuplicate}
    <div class="text-center py-12 space-y-4">
      <span class="text-[64px]">⚠️</span>
      <h2 class="font-['Nunito'] font-black text-[28px] text-[#333]">
        Already submitted!
      </h2>
      <p class="font-['Inter'] text-[16px] text-[#666]">
        This name has already been submitted for this event. Not cool.
      </p>
      <button
        type="button"
        class="mt-6 h-12 px-8 rounded-[73px] border-[3px] border-[#f2f2f2] bg-white font-['Nunito'] font-bold text-[16px] text-[#333] hover:bg-[#f8f8f8] transition"
        onclick={() => {
          isDuplicate = false;
          fullName = "";
          hasVolunteeredBefore = null;
        }}
      >
        Try a different name
      </button>
    </div>
  {:else if submitted}
    <div class="text-center py-12 space-y-4">
      <span class="text-[64px]">🍀</span>
      <h2 class="font-['Nunito'] font-black text-[28px] text-[#333]">
        You're in!
      </h2>
      <p class="font-['Inter'] text-[16px] text-[#666]">
        Your application has been submitted successfully.
      </p>
      <button
        type="button"
        class="mt-6 h-12 px-8 rounded-[73px] border-[3px] border-[#f2f2f2] bg-white font-['Nunito'] font-bold text-[16px] text-[#333] hover:bg-[#f8f8f8] transition"
        onclick={() => (submitted = false)}
      >
        Okay! TYSM JUDE!!!
      </button>
    </div>
  {:else}
    <section class="space-y-8">
      {#if error}
        <div class="rounded-xl border-[3px] border-red-400 bg-red-50 p-4">
          <p class="font-['Inter'] text-[14px] text-red-700">{error}</p>
        </div>
      {/if}

      <!-- Countdown + progress -->
      {#if activeEvent.ends_at}
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

      <!-- Title -->
      <h1
        class="font-['Nunito'] font-black text-[32px] leading-none tracking-[-0.02em] text-[#020202] cursor-default"
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
      </h1>

      <!-- You are applying for -->
      <div class="space-y-4">
        <p class="font-['Inter'] text-[16px] tracking-[-0.02em] text-[#333]">
          You are applying for...
        </p>
        <div class="flex justify-center">
          <div
            class="w-full h-16 rounded-[73px] border-[3px] border-[#fba24d] bg-[#ffeedd] px-[44px] flex items-center justify-center gap-2 text-[#333]"
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

      <!-- Selected before -->
      <div class="space-y-4">
        <p class="font-['Inter'] text-[16px] tracking-[-0.02em] text-[#333]">
          Have you been selected as a volunteer before?
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            class="h-16 flex-1 rounded-[73px] border-[3px] {hasVolunteeredBefore ===
            true
              ? 'border-[#fba24d] bg-[#ffeedd]'
              : 'border-[#f2f2f2] border-b-[5px] bg-white'} px-[44px] font-['Nunito'] font-black text-[18px] text-[#333] hover:opacity-80 transition"
            onclick={() => (hasVolunteeredBefore = true)}
          >
            Yes
          </button>
          <button
            type="button"
            class="h-16 flex-1 rounded-[73px] border-[3px] {hasVolunteeredBefore ===
            false
              ? 'border-[#fba24d] bg-[#ffeedd]'
              : 'border-[#f2f2f2] border-b-[5px] bg-white'} px-[44px] font-['Nunito'] font-black text-[18px] text-[#333] hover:opacity-80 transition"
            onclick={() => (hasVolunteeredBefore = false)}
          >
            No
          </button>
        </div>
      </div>

      <!-- Name -->
      <div class="space-y-4">
        <p class="font-['Inter'] text-[16px] tracking-[-0.02em] text-[#333]">
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

      <!-- Submit -->
      <div class="space-y-3 text-center">
        <button
          type="button"
          class="w-full h-16 rounded-[73px] border-[3px] border-[#4dfb59] bg-[#e2ffdd] px-[44px] flex items-center justify-center gap-2 text-[#333] font-['Nunito'] font-black text-[18px] hover:bg-[#d4f5cc] transition disabled:opacity-50 disabled:cursor-not-allowed"
          onclick={onSubmit}
          disabled={!fullName.trim() ||
            hasVolunteeredBefore === null ||
            submitting}
          aria-disabled={!fullName.trim() ||
            hasVolunteeredBefore === null ||
            submitting}
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
    </section>
  {/if}
</main>

<style>
  body {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    overflow: hidden;
    touch-action: pan-y;
  }
</style>
