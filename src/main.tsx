import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Auto-register and immediately activate updates across all devices & installed PWAs
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      // Force checking for updates periodically and when app becomes visible
      setInterval(() => {
        registration.update();
      }, 30 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          registration.update();
        }
      });
    }
  },
});

createRoot(document.getElementById("root")!).render(<App />);

