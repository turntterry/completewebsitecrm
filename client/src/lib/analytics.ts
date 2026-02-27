let initialized = false;

const GA_ID =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GA_ID) ||
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GA_MEASUREMENT_ID);

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function initAnalytics() {
  if (initialized || !GA_ID || typeof document === "undefined") return;
  initialized = true;

  // Inject gtag script
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments as unknown as never);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: true });
}

export function trackEvent(event: string, params: Record<string, unknown> = {}) {
  if (!window.gtag) return;
  window.gtag("event", event, params);
}
