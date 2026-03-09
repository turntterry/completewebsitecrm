/**
 * Machine-readable source of truth for window package tier inclusions.
 * Feature keys here must exactly match suppressIfFeatureCovered values on
 * upsell catalog items. Keep in sync with WindowPackageSelector display copy.
 *
 * good   = Expert Essential
 * better = Signature Sparkle
 * best   = Platinum Perfection
 */
export const WINDOW_PACKAGE_FEATURES: Record<string, string[]> = {
  good: [
    "exterior_glass",
    "screen_removal_replacement",
  ],
  better: [
    "exterior_glass",
    "interior_glass",
    "frames_wiped",
    "interior_ledges_wiped",
  ],
  best: [
    "exterior_glass",
    "interior_glass",
    "frames_wiped",
    "interior_ledges_wiped",
    "sills",
    "ledges",
    "deep_screen_washing",
    "deep_track_detailing",
  ],
};

/**
 * Flat list of all possible window package feature keys, with human labels.
 * Used by the admin editor chip selector.
 */
export const WINDOW_FEATURE_LIST: { key: string; label: string }[] = [
  { key: "exterior_glass",            label: "Exterior glass" },
  { key: "interior_glass",            label: "Interior glass" },
  { key: "frames_wiped",              label: "Frames wiped" },
  { key: "interior_ledges_wiped",     label: "Interior ledges wiped" },
  { key: "sills",                     label: "Sills" },
  { key: "ledges",                    label: "Ledges" },
  { key: "deep_screen_washing",       label: "Deep screen washing" },
  { key: "deep_track_detailing",      label: "Deep track detailing" },
  { key: "screen_removal_replacement",label: "Screen removal / replacement" },
];
