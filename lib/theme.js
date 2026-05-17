export function getSystemTheme() {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(preference) {
  if (typeof window === "undefined") return;
  const resolved = preference === "system" ? getSystemTheme() : preference;
  if (resolved === "light") {
    document.documentElement.classList.add("light");
  } else {
    document.documentElement.classList.remove("light");
  }
}

export function getSavedTheme() {
  if (typeof window === "undefined") return "system";
  return localStorage.getItem("myteam-theme") ?? "system";
}

export function saveTheme(preference) {
  localStorage.setItem("myteam-theme", preference);
  applyTheme(preference);
}