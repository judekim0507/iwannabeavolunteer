import { json, type RequestHandler } from "@sveltejs/kit";
import { PUBLIC_WHEEL_OF_NAMES_KEY } from "$env/static/public";

export const POST: RequestHandler = async ({ request }) => {
  try {
    if (!PUBLIC_WHEEL_OF_NAMES_KEY) {
      return json({ error: "Missing PUBLIC_WHEEL_OF_NAMES_KEY" }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      title,
      description,
      entries,
      shareMode = "copyable",
      displayWinnerDialog = true,
      slowSpin = false,
      pageBackgroundColor = "#FFFFFF",
    } = body || {};

    if (!Array.isArray(entries) || entries.length === 0) {
      return json({ error: "entries array is required" }, { status: 400 });
    }
    // Title/description fallback with safe limits
    const safeTitle =
      (title || "Random Picker").toString().slice(0, 50) || "Random Picker";
    const safeDescription =
      (description || "Generated via API").toString().slice(0, 200) ||
      "Generated via API";

    // Normalize entries: accept strings or objects with label
    const normalizedEntries = entries.map((e: any) => {
      if (typeof e === "string") return { text: e, enabled: true, weight: 1 };
      if (e && typeof e === "object") {
        const label = e.label ?? e.text ?? String(e);
        return { text: String(label), enabled: e.enabled ?? true, weight: e.weight ?? 1 };
      }
      return { text: String(e), enabled: true, weight: 1 };
    });

    const payload = {
      shareMode,
      wheelConfig: {
        // Top-level wheel configuration per API sample
        displayWinnerDialog,
        slowSpin,
        pageBackgroundColor,
        description: safeDescription,
        animateWinner: false,
        title: safeTitle,
        type: "color",
        autoRemoveWinner: false,
        duringSpinSound: "ticking-sound",
        maxNames: 1000,
        afterSpinSoundVolume: 50,
        spinTime: 10,
        hubSize: "S",
        entries: normalizedEntries,
        isAdvanced: false,
        showTitle: true,
        duringSpinSoundVolume: 50,
        displayRemoveButton: true,
        pictureType: "none",
        allowDuplicates: false,
        drawOutlines: false,
        launchConfetti: true,
        drawShadow: true,
        pointerChangesColor: true,
      },
    };

    const resp = await fetch("https://wheelofnames.com/api/v2/wheels", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-api-key": PUBLIC_WHEEL_OF_NAMES_KEY,
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!resp.ok) {
      return json(
        {
          error: data?.message || "Failed to create wheel",
          details: data,
          status: resp.status,
        },
        { status: resp.status || 500 }
      );
    }

    // Extract path from nested response structure
    const root = data?.data ?? data;
    const path = root?.parsed?.path || root?.path;
    
    if (!path) {
      return json(
        { error: "No path in response", details: data },
        { status: 400 }
      );
    }

    const url = `https://wheelofnames.com/${path}`;

    return json({ id: path, url });
  } catch (err: any) {
    return json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
};


