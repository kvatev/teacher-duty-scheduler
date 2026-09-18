import { DBBroadcast } from "./localDB";

const BROADCAST_CHANNEL_NAME = "teacher-duty-broadcast-channel";

export type NotificationPermissionState = "granted" | "denied" | "default" | "unsupported";

/**
 * Check if the browser / platform supports the Web Notifications API
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    
    // Dispatch event so UI components can update reactively
    window.dispatchEvent(
      new CustomEvent("notification-permission-change", { detail: { permission } })
    );

    if (permission === "granted") {
      // Send a confirmation notification
      await sendSystemNotification("🔔 Известията са активирани", {
        body: "Вече ще получавате известия за важни съобщения и промени в графика.",
        tag: "notifications-enabled",
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
}

/**
 * Send a native system notification via Service Worker (preferred for Mobile/PWA)
 * or fallback to window.Notification (for desktop tabs).
 */
export async function sendSystemNotification(
  title: string,
  options: {
    body?: string;
    tag?: string;
    icon?: string;
    badge?: string;
    vibrate?: number[];
    data?: Record<string, unknown>;
  } = {}
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (!isNotificationSupported() || Notification.permission !== "granted") {
    console.warn("sendSystemNotification skipped: notifications not supported or permission not granted. Status:", typeof Notification !== "undefined" ? Notification.permission : "unsupported");
    return false;
  }

  const notificationOptions = {
    body: options.body || "",
    icon: options.icon || "/pwa-calendar-192.png",
    badge: options.badge || "/pwa-calendar-192.png",
    tag: options.tag || `duty-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    data: options.data || { url: "/" },
  };

  // Trigger device haptic vibration if supported
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(options.vibrate || [300, 100, 300]);
    } catch {
      // Ignore vibration errors
    }
  }

  // 1. Try via Service Worker (MANDATORY on Android Chrome, iOS 16.4+ PWA)
  if ("serviceWorker" in navigator) {
    try {
      // Step A: Check if there is already an active registration (instant, 0ms)
      let reg = await navigator.serviceWorker.getRegistration();

      // Step B: If not active yet, await ready with 4000ms timeout
      if (!reg) {
        reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
        ]);
      }

      // Step C: If still no registration, attempt to register directly
      if (!reg && "register" in navigator.serviceWorker) {
        try {
          reg = await navigator.serviceWorker.register("/sw.js");
          if (reg.installing || reg.waiting) {
            await new Promise((r) => setTimeout(r, 600));
          }
        } catch (regError) {
          console.warn("Direct SW register attempt failed:", regError);
        }
      }

      if (reg && typeof reg.showNotification === "function") {
        await reg.showNotification(title, {
          ...notificationOptions,
          vibrate: options.vibrate || [300, 100, 300, 100, 300],
        } as NotificationOptions);
        console.log("System notification displayed via ServiceWorker successfully!");
        return true;
      }
    } catch (swError) {
      console.warn("ServiceWorker notification failed:", swError);
    }
  }

  // 2. Desktop Browser fallback (only when Notification constructor is legal and not on Android)
  try {
    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if (!isMobile && typeof Notification !== "undefined") {
      const n = new Notification(title, notificationOptions as NotificationOptions);
      n.onclick = () => {
        window.focus();
        n.close();
      };
      console.log("Desktop window notification displayed successfully!");
      return true;
    }
  } catch (e) {
    console.warn("Window notification constructor failed:", e);
  }

  return false;
}

/**
 * Formats and triggers a system notification for a school broadcast message
 */
export async function notifyBroadcast(broadcast: DBBroadcast): Promise<boolean> {
  let title = "📢 Съобщение за дежурства";
  let vibratePattern = [200, 100, 200];

  if (broadcast.priority === "urgent") {
    title = "🚨 СПЕШНО: Училищно съобщение";
    vibratePattern = [300, 100, 300, 100, 300];
  } else if (broadcast.priority === "warning") {
    title = "⚠️ ВАЖНО: Училищно съобщение";
    vibratePattern = [250, 100, 250];
  }

  // 1. Send native system notification (for mobile/desktop OS notification)
  let systemSent = false;
  try {
    systemSent = await sendSystemNotification(title, {
      body: broadcast.message,
      tag: `broadcast-${broadcast.id}`,
      vibrate: vibratePattern,
      data: { url: "/", broadcastId: broadcast.id },
    });
  } catch (e) {
    console.warn("System notification failed:", e);
  }

  // 2. Dispatch local event in current window so in-app toasts & banners fire immediately
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("new-broadcast-received", { detail: broadcast })
      );
    }
  } catch {
    // Ignore window event errors
  }

  // 3. Broadcast to other tabs/windows via BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.postMessage({ type: "NEW_BROADCAST", broadcast });
      bc.close();
    }
  } catch {
    // Ignore channel errors
  }

  return systemSent;
}

/**
 * Listen for broadcasts sent from other tabs or background sessions
 */
export function initBroadcastListener(onNewBroadcast?: (b: DBBroadcast) => void): () => void {
  if (typeof window === "undefined") return () => {};

  let channel: BroadcastChannel | null = null;

  if (typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data?.type === "NEW_BROADCAST" && event.data.broadcast) {
          const b: DBBroadcast = event.data.broadcast;
          onNewBroadcast?.(b);
          
          // If the page is hidden or tab is in background, make sure the user gets notified
          if (document.hidden && Notification.permission === "granted") {
            notifyBroadcast(b);
          }
        }
      };
    } catch {
      // Ignore channel errors
    }
  }

  // Listen for local broadcast dispatch (in the current tab/window)
  const handleLocal = (e: Event) => {
    const custom = e as CustomEvent<DBBroadcast>;
    if (custom.detail) {
      onNewBroadcast?.(custom.detail);
    }
  };
  window.addEventListener("new-broadcast-received", handleLocal);

  // Also listen for cross-tab storage changes
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === "teacher_scheduler_broadcasts" && e.newValue) {
      try {
        const broadcasts: DBBroadcast[] = JSON.parse(e.newValue);
        if (broadcasts.length > 0) {
          const latest = broadcasts[0];
          // Check if this broadcast was created recently (within last 15 seconds)
          const createdTime = new Date(latest.created_at).getTime();
          if (Date.now() - createdTime < 15000) {
            onNewBroadcast?.(latest);
            if (document.hidden && Notification.permission === "granted") {
              notifyBroadcast(latest);
            }
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
  };

  window.addEventListener("storage", handleStorageChange);

  // Listen for cloud database updates received on this device
  const handleCloudUpdate = async (e: Event) => {
    const custom = e as CustomEvent<{
      exportedAt: string;
      newBroadcasts: DBBroadcast[];
      isActualUpdate: boolean;
    }>;
    const { newBroadcasts, isActualUpdate } = custom.detail || {};

    // 1. If new broadcast messages were received from the cloud, notify the user
    if (newBroadcasts && newBroadcasts.length > 0) {
      for (const b of newBroadcasts) {
        onNewBroadcast?.(b);
        await notifyBroadcast(b);
      }
    } else if (isActualUpdate) {
      // 2. If the duty schedule itself was updated, trigger a system notification
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        await sendSystemNotification("📅 Обновен график за дежурства", {
          body: "Публикуван е актуален график за дежурствата. Промените са заредени!",
          tag: "schedule-cloud-update",
        });
      }
    }
  };
  window.addEventListener("schedule-cloud-updated", handleCloudUpdate);

  return () => {
    channel?.close();
    window.removeEventListener("new-broadcast-received", handleLocal);
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener("schedule-cloud-updated", handleCloudUpdate);
  };
}
