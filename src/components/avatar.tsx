import { initials } from "@/lib/format";

const SIZES = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-24 w-24 text-2xl",
} as const;

export function Avatar({
  name,
  url,
  size = "md",
}: {
  name: string;
  url?: string | null;
  size?: keyof typeof SIZES;
}) {
  const cls = SIZES[size];
  if (url) {
    return (
      <img
        src={url}
        alt={`Profilbillede af ${name}`}
        className={`${cls} shrink-0 rounded-full border object-cover`}
      />
    );
  }
  return (
    <span
      className={`flex ${cls} shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary`}
    >
      {initials(name) || "?"}
    </span>
  );
}
