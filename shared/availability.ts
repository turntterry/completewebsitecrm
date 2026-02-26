export type Slot = {
  id: string;
  date: string; // YYYY-MM-DD
  window: string; // e.g., "09:00-11:00"
  display: string; // human readable
};

export interface AvailabilityProviderOptions {
  durationMinutes: number;
  daysAhead?: number;
}

export interface AvailabilityProvider {
  getSlots(opts: AvailabilityProviderOptions): Slot[];
}

// Mock provider: duration-aware windows generated locally.
export const mockAvailabilityProvider: AvailabilityProvider = {
  getSlots({ durationMinutes, daysAhead = 5 }) {
    const now = new Date();
    const windowMinutes = Math.min(180, Math.max(60, durationMinutes + 30));

    const slots: Slot[] = [];
    for (let i = 1; i <= daysAhead; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      const windows =
        windowMinutes <= 90
          ? ["09:00-10:30", "11:00-12:30", "13:00-14:30", "15:00-16:30"]
          : windowMinutes <= 120
            ? ["09:00-11:00", "12:00-14:00", "15:00-17:00"]
            : ["09:00-12:00", "13:00-16:00"];

      windows.forEach((w, idx) => {
        slots.push({
          id: `${dateStr}_${idx}`,
          date: dateStr,
          window: w,
          display: `${label} · ${w}`,
        });
      });
    }
    return slots;
  },
};
