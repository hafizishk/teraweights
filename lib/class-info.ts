import type { ClassSlug } from "@/lib/types";

/** Two lines of "what to expect" per class type, for the session sheet. */
export const CLASS_INFO: Record<ClassSlug, { line1: string; line2: string }> = {
  energise_east: {
    line1: "Outdoor bootcamp by the reservoir. Strength, conditioning and a lot of encouragement.",
    line2: "Bring water and a mat. Wet-weather plan is the shelter nearby.",
  },
  energise_west: {
    line1: "Same Energise bootcamp, west side. Strength and conditioning, all levels.",
    line2: "Bring water and a mat. Venue details from your coach.",
  },
  prime: {
    line1: "Small-group strength in the gym. Coached lifts, progressive blocks, 12 spots.",
    line2: "PRO tier only. Wear shoes you can lift in.",
  },
  fitness_engine: {
    line1: "Engine work: running, rowing and sled intervals built around PA.ROX.",
    line2: "Uses a Fitness Engine pass from your package.",
  },
};
