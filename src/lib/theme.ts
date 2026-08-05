import { useCallback, useState } from "react";

export type ColorTheme = {
  id: string;
  label: string;
  swatches: [string, string, string];
};

export const COLOR_THEMES: ColorTheme[] = [
  { id: "klubhus", label: "Klubhus", swatches: ["#12324F", "#1F9D55", "#F2B33D"] },
  { id: "graes", label: "Græsbane", swatches: ["#14532D", "#22A355", "#F2B33D"] },
  { id: "himmel", label: "Himmelblå", swatches: ["#1E3A8A", "#2F7DE1", "#F2B33D"] },
  { id: "rod", label: "Rød", swatches: ["#7F1D1D", "#DC2626", "#F2B33D"] },
  { id: "nat", label: "Nat (mørk)", swatches: ["#1B2A3B", "#3ECF8E", "#F2B33D"] },
];

const STORAGE_KEY = "boedekasse:color-theme";
const DEFAULT_THEME = "klubhus";

function applyColorTheme(id: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (id === "nat") {
    root.classList.add("dark");
    root.removeAttribute("data-theme");
    return;
  }
  root.classList.remove("dark");
  if (id === DEFAULT_THEME) {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", id);
  }
}

/** Kaldes én gang ved app-start, så det gemte tema gælder før første render. */
export function initColorTheme() {
  if (typeof window === "undefined") return;
  applyColorTheme(window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_THEME);
}

export function useColorTheme(): [string, (id: string) => void] {
  const [theme, setTheme] = useState<string>(() =>
    typeof window === "undefined"
      ? DEFAULT_THEME
      : (window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_THEME),
  );

  const setColorTheme = useCallback((id: string) => {
    window.localStorage.setItem(STORAGE_KEY, id);
    applyColorTheme(id);
    setTheme(id);
  }, []);

  return [theme, setColorTheme];
}
