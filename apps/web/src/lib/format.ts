import type { RiskBucket } from "@aegis/db";

export function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Tailwind classes for a risk bucket badge. */
export function bucketBadge(bucket: RiskBucket | null): string {
  switch (bucket) {
    case "RED":
      return "bg-red-100 text-red-800 ring-red-600/20";
    case "AMBER":
      return "bg-amber-100 text-amber-800 ring-amber-600/20";
    case "GREEN":
      return "bg-green-100 text-green-800 ring-green-600/20";
    default:
      return "bg-gray-100 text-gray-700 ring-gray-500/20";
  }
}

/** Tailwind classes for a lead-status / severity pill. */
export function pill(tone: "gray" | "blue" | "green" | "amber" | "red"): string {
  const map = {
    gray: "bg-gray-100 text-gray-700 ring-gray-500/20",
    blue: "bg-blue-100 text-blue-800 ring-blue-600/20",
    green: "bg-green-100 text-green-800 ring-green-600/20",
    amber: "bg-amber-100 text-amber-800 ring-amber-600/20",
    red: "bg-red-100 text-red-800 ring-red-600/20",
  } as const;
  return map[tone];
}
