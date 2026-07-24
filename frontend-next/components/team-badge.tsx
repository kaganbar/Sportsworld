import { Team } from "@/lib/api";

/**
 * Team crest. Uses the backend-provided logo_url (a data: URI monogram) when
 * present, otherwise falls back to a colored disc with the team's initials
 * keyed on its primary_color — so every team renders something on-brand even
 * before logo enrichment lands (see the Team.logo_url note in lib/api.ts).
 */
export function TeamBadge({ team, size = 40 }: { team: Team; size?: number }) {
  const initials = (team.short_name || team.name)
    .slice(0, 3)
    .toUpperCase();

  if (team.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={team.logo_url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-contain"
      />
    );
  }

  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-bold text-white ring-1 ring-inset ring-white/15"
      style={{
        width: size,
        height: size,
        background: team.primary_color || "#334155",
        fontSize: size * 0.32,
        // Dark text on very light crests for legibility.
        color: isLight(team.primary_color) ? "#0a1f14" : "#ffffff",
      }}
    >
      {initials}
    </span>
  );
}

function isLight(hex?: string): boolean {
  if (!hex) return false;
  const m = hex.replace("#", "");
  if (m.length < 6) return false;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  // Perceived luminance.
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.7;
}
