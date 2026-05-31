// Personas style — clean flat-design half-body portraits, clearly recognizable

const AVATAR_SEEDS = [
  { id: "av1",  seed: "John",      bg: "b6e3f4" },
  { id: "av2",  seed: "Sarah",     bg: "ffd5dc" },
  { id: "av3",  seed: "Michael",   bg: "c0aede" },
  { id: "av4",  seed: "Emily",     bg: "d1f4e0" },
  { id: "av5",  seed: "David",     bg: "ffdfba" },
  { id: "av6",  seed: "Jessica",   bg: "ffd5dc" },
  { id: "av7",  seed: "James",     bg: "b6e3f4" },
  { id: "av8",  seed: "Ashley",    bg: "d1f4e0" },
  { id: "av9",  seed: "Robert",    bg: "c0aede" },
  { id: "av10", seed: "Amanda",    bg: "ffdfba" },
  { id: "av11", seed: "William",   bg: "b6e3f4" },
  { id: "av12", seed: "Stephanie", bg: "ffd5dc" },
];

export const AVATARS = AVATAR_SEEDS;

export function AvatarSVG({ seed, bg, size = 48 }) {
  const url = `https://api.dicebear.com/9.x/personas/svg?seed=${seed}&backgroundColor=${bg}&backgroundType=solid&size=${size}`;
  return (
    <img
      src={url}
      alt={seed}
      width={size}
      height={size}
      style={{ borderRadius: "50%", display: "block" }}
    />
  );
}

export default function AvatarPicker({ value, onChange }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wide">Or choose an avatar</p>
      <div className="grid grid-cols-6 gap-2">
        {AVATAR_SEEDS.map((av) => (
          <button
            key={av.id}
            type="button"
            onClick={() => onChange(av.id)}
            className={`rounded-full transition-all focus:outline-none overflow-hidden ${
              value === av.id
                ? "ring-2 ring-primary ring-offset-2 scale-110"
                : "hover:scale-105 opacity-80 hover:opacity-100"
            }`}
            title={av.seed}
          >
            <AvatarSVG {...av} size={44} />
          </button>
        ))}
      </div>
    </div>
  );
}