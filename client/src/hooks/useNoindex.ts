import { useEffect } from "react";

/**
 * Hook to add noindex, nofollow meta tags to a page.
 * Used for admin pages and other pages that should not be indexed by search engines.
 */
export function useNoindex() {
  useEffect(() => {
    // Find or create robots meta tag
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement("meta");
      robotsMeta.setAttribute("name", "robots");
      document.head.appendChild(robotsMeta);
    }
    
    // Set content to noindex, nofollow
    robotsMeta.setAttribute("content", "noindex, nofollow");
  }, []);
}
