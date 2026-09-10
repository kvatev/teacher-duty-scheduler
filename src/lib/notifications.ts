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
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  const notificationOptions: NotificationOptions & { renotify?: boolean } = {
    body: options.body || "",
    icon: options.icon || "/pwa-calendar-192.png",
    badge: options.badge || "/pwa-calendar-192.png",
    tag: options.tag || "teacher-duty-notification",
    renotify: true,
    data: options.data || { url: "/" },
  };

  // 1. Try via Service Worker (crucial for mobile/PWA and background)
  if ("serviceWorker" in navigator) {
    try {
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
      ]);
      if (registration && "showNotification" in registration) {
        await registration.showNotification(title, {
          ...notificationOptions,
          // vibrate is supported on Android / Mobile
          ...(options.vibrate ? { vibrate: options.vibrate } : { vibrate: [200, 100, 200] }),
        } as NotificationOptions);
        return true;
      }
    } catch (swError) {
      console.warn("ServiceWorker notification failed, falling back to Notification constructor:", swError);
    }
  }

  // 2. Fallback to standard Window Notification (Desktop browsers)
  try {
    const n = new Notification(title, notificationOptions);
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return true;
  } catch (e) {
    console.error("Window notification failed:", e);
    return false;
  }
}

/**
 * Formats and triggers a system notification for a school broadcast message
 */
export async function notifyBroadcast(broadcast: DBBroadcast): Promise<void> {
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
  try {
    await sendSystemNotification(title, {
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

  return () => {
    channel?.close();
    window.removeEventListener("new-broadcast-received", handleLocal);
    window.removeEventListener("storage", handleStorageChange);
  };
}
