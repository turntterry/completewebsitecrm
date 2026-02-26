export type Slot = {
  id: string;
  date: string; // YYYY-MM-DD
  window: string; // e.g., "09:00-11:00"
  display: string; // human readable
};

export interface AvailabilityProviderOptions {
  durationMinutes: number;
  daysAhead?: number;
  startHour?: number; // 24h format; default 9
  endHour?: number; // default 17
}

export interface AvailabilityProvider {
  getSlots(opts: AvailabilityProviderOptions): Slot[];
}

// Mock provider: duration-aware windows generated locally.
export const mockAvailabilityProvider: AvailabilityProvider = {
  getSlots({ durationMinutes, daysAhead = 7, startHour = 9, endHour = 17 }) {
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

      const windows: string[] = [];
      const dayStart = Math.max(6, startHour);
      const dayEnd = Math.min(20, endHour);
      const increment = windowMinutes <= 90 ? 90 : windowMinutes <= 120 ? 120 : 180;

      for (let hour = dayStart; hour + windowMinutes / 60 <= dayEnd; hour += increment / 60) {
        const start = `${String(hour).padStart(2, "0")}:${windowMinutes === 90 ? "00" : "00"}`;
        const endMinutes = hour * 60 + windowMinutes;
        const endHourLocal = Math.floor(endMinutes / 60);
        const endMinLocal = endMinutes % 60;
        const end = `${String(endHourLocal).padStart(2, "0")}:${String(endMinLocal).padStart(2, "0")}`;
        windows.push(`${start}-${end}`);
      }

      // Fallback windows if config produces none
      if (windows.length === 0) {
        windows.push("09:00-11:00", "12:00-14:00", "15:00-17:00");
      }

      windows.forEach((w, idx) => {
        slots.push({
          id: `${dateStr}_${idx}_${w}`,
          date: dateStr,
          window: w,
          display: `${label} · ${w}`,
        });
      });
    }
    return slots;
  },
};
