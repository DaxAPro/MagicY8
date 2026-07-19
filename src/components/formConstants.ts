export type AccentColor = "purple" | "blue" | "cyan" | "orange"

const glowPurple = "0 0 20px rgba(168,85,247,0.4), 0 0 40px rgba(168,85,247,0.2)"
const glowBlue = "0 0 20px rgba(59,130,246,0.4)"
const glowCyan = "0 0 30px rgba(6,182,212,0.5)"
const glowOrange = "0 0 20px rgba(249,115,22,0.4)"

export const ACCENT_GLOWS: Record<AccentColor, string> = {
  purple: glowPurple,
  blue: glowBlue,
  cyan: glowCyan,
  orange: glowOrange,
}

export const ACCENT_BORDERS: Record<AccentColor, string> = {
  purple: "rgba(168,85,247,0.3)",
  blue: "rgba(59,130,246,0.3)",
  cyan: "rgba(6,182,212,0.3)",
  orange: "rgba(249,115,22,0.3)",
}

export const ACCENT_FOCUSES: Record<AccentColor, string> = {
  purple: "#a855f7",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  orange: "#f97316",
}

export const ACCENT_LABELS: Record<AccentColor, string> = {
  purple: "purple.300",
  blue: "blue.300",
  cyan: "cyan.300",
  orange: "orange.300",
}

export const ACCENT_HOVERS: Record<AccentColor, string> = {
  purple: "rgba(168,85,247,0.1)",
  blue: "rgba(59,130,246,0.1)",
  cyan: "rgba(6,182,212,0.1)",
  orange: "rgba(249,115,22,0.1)",
}

export const ACCENT_SELECTED: Record<AccentColor, string> = {
  purple: "rgba(168,85,247,0.2)",
  blue: "rgba(59,130,246,0.2)",
  cyan: "rgba(6,182,212,0.2)",
  orange: "rgba(249,115,22,0.2)",
}

export const ACCENT_SELECTED_TEXT: Record<AccentColor, string> = {
  purple: "#c084fc",
  blue: "#93c5fd",
  cyan: "#67e8f9",
  orange: "#fdba74",
}

export type CollectionItem = { label: string; value: string }
