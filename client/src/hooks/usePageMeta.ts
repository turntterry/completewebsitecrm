import { useEffect } from "react";
import { BUSINESS } from "@shared/data";

type MetaOptions = {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
};

/**
 * Lightweight meta manager for marketing pages.
 * Sets document title, description, Open Graph, and Twitter tags.
 * Safe to call even if some values are missing.
 */
export function usePageMeta(options: MetaOptions) {
  const { title, description, image, url, type = "website" } = options;
  const fallbackImage = image || BUSINESS.logoLargeUrl || BUSINESS.logoUrl;

  useEffect(() => {
    if (title) {
      document.title = title;
      setMeta("property", "og:title", title);
      setMeta("name", "twitter:title", title);
    }
    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
      setMeta("name", "twitter:description", description);
    }
    if (fallbackImage) {
      setMeta("property", "og:image", fallbackImage);
      setMeta("name", "twitter:image", fallbackImage);
    }
    if (url) {
      setMeta("property", "og:url", url);
    }
    setMeta("property", "og:type", type);
    setMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
  }, [title, description, image, url, type]);
}

function setMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.querySelector(`meta[${attr}=\"${key}\"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}
