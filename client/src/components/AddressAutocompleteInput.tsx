/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { ensureGoogleMaps, parsePlaceResult, type ParsedAddress } from "@/lib/maps";

export type { ParsedAddress };

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (parsed: ParsedAddress) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function AddressAutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder = "123 Main Street",
  disabled,
  className,
  id,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [ready, setReady] = useState(false);

  // Load Google Maps once on mount
  useEffect(() => {
    ensureGoogleMaps()
      .then(() => setReady(true))
      .catch((err) => console.error("[AddressAutocomplete] Maps failed to load:", err));
  }, []);

  // Attach Autocomplete once Maps is ready
  useEffect(() => {
    if (!ready || !inputRef.current || acRef.current) return;

    const ac = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: "us" },
      fields: ["formatted_address", "address_components", "geometry", "place_id"],
    });

    acRef.current = ac;

    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (!place.address_components) return;
      const parsed = parsePlaceResult(place);
      // Update the visible input to the street portion (or full address if no street parsed)
      onChange(parsed.street || parsed.formattedAddress);
      onSelect(parsed);
    });
  }, [ready, onChange, onSelect]);

  return (
    <Input
      ref={inputRef}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      autoComplete="off"
    />
  );
}
