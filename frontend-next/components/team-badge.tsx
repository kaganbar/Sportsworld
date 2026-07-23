// Small team badge used anywhere a team name is shown (game cards,
// standings tables, and — once the top-scorers table lands — there too):
// renders the backend's data-URI SVG monogram logo when present, falling
// back to a colored initials circle so the UI never breaks before the
// backend/reseed adding `logo_url` actually lands (or for any team that
// slips through without one).
function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export default function TeamBadge({
  name,
  logoUrl,
  color,
  size = 24,
}: {
  name: string;
  logoUrl?: string | null;
  color?: string;
  size?: number;
}) {
  const style = { width: size, height: size };

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        style={style}
        className="shrink-0 rounded-full bg-white/5 object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ ...style, backgroundColor: color || "var(--brand-accent)", fontSize: size * 0.4 }}
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-[#06121c]"
    >
      {initials(name)}
    </span>
  );
}
