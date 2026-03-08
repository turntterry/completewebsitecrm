/// <reference types="@types/google.maps" />

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Singleton promise — only one script tag ever added, regardless of how many
// components call ensureGoogleMaps() simultaneously.
let _loadPromise: Promise<void> | null = null;

export function ensureGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  if (_loadPromise) return _loadPromise;

  _loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,geocoding`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      _loadPromise = null;
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(script);
  });

  return _loadPromise;
}

export type ParsedAddress = {
  street: string;
  city: string;
  state: string;
  zip: string;
  formattedAddress: string;
  lat?: number;
  lng?: number;
  placeId?: string;
};

type AddressComponent = {
  types: string[];
  long_name: string;
  short_name: string;
};

function makeExtractors(components: AddressComponent[]) {
  const get = (type: string) =>
    components.find((c) => c.types.includes(type))?.long_name ?? "";
  const getShort = (type: string) =>
    components.find((c) => c.types.includes(type))?.short_name ?? "";
  return { get, getShort };
}

export function parsePlaceResult(
  place: google.maps.places.PlaceResult
): ParsedAddress {
  const { get, getShort } = makeExtractors(place.address_components ?? []);
  const street = [get("street_number"), get("route")].filter(Boolean).join(" ");
  const city =
    get("locality") ||
    get("sublocality") ||
    get("sublocality_level_1") ||
    get("administrative_area_level_3");
  return {
    street,
    city,
    state: getShort("administrative_area_level_1"),
    zip: get("postal_code"),
    formattedAddress: place.formatted_address ?? "",
    lat: place.geometry?.location?.lat(),
    lng: place.geometry?.location?.lng(),
    placeId: place.place_id,
  };
}

export function parseGeocoderResult(
  result: google.maps.GeocoderResult
): ParsedAddress {
  const { get, getShort } = makeExtractors(result.address_components ?? []);
  const street = [get("street_number"), get("route")].filter(Boolean).join(" ");
  const city =
    get("locality") || get("sublocality") || get("sublocality_level_1");
  return {
    street,
    city,
    state: getShort("administrative_area_level_1"),
    zip: get("postal_code"),
    formattedAddress: result.formatted_address ?? "",
    lat: result.geometry?.location?.lat(),
    lng: result.geometry?.location?.lng(),
  };
}

export async function geocodeAddress(rawAddress: string): Promise<ParsedAddress> {
  await ensureGoogleMaps();
  const geocoder = new google.maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address: rawAddress }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        resolve(parseGeocoderResult(results[0]));
      } else {
        reject(new Error("Address not found"));
      }
    });
  });
}
