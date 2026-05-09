import { WebHaptics } from "web-haptics";

type HapticInput = Parameters<WebHaptics["trigger"]>[0];

let instance: WebHaptics | null = null;

function get(): WebHaptics | null {
    if (typeof window === "undefined") return null;
    if (!instance) instance = new WebHaptics();
    return instance;
}

export function haptic(input?: HapticInput) {
    get()?.trigger(input);
}
