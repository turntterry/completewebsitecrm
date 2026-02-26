import { useEffect } from "react";

/**
 * Hook to set the canonical URL for the current page.
 * Ensures each page self-references its own URL instead of inheriting the homepage canonical.
 */
export function useCanonical(path: string) {
  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const canonicalUrl = `${origin}${path}`;
    
    // Find or create canonical link element
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    
    // Set the href to the current page's URL
    canonical.setAttribute("href", canonicalUrl);
  }, [path]);
}
