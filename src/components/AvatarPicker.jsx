// Notionists style — clean, professional illustrated portraits (closest to flat-design headshots)

const AVATAR_SEEDS = [
  { id: "av1",  seed: "Alexander", bg: "b6e3f4" },
  { id: "av2",  seed: "Charlotte", bg: "ffd5dc" },
  { id: "av3",  seed: "Benjamin",  bg: "c0aede" },
  { id: "av4",  seed: "Olivia",    bg: "d1f4e0" },
  { id: "av5",  seed: "Harrison",  bg: "ffdfba" },
  { id: "av6",  seed: "Sophia",    bg: "fde8f0" },
  { id: "av7",  seed: "Marcus",    bg: "b6e3f4" },
  { id: "av8",  seed: "Isabella",  bg: "d1f4e0" },
  { id: "av9",  seed: "Nathan",    bg: "c0aede" },
  { id: "av10", seed: "Victoria",  bg: "ffdfba" },
  { id: "av11", seed: "Ethan",     bg: "e8f4fd" },
  { id: "av12", seed: "Amelia",    bg: "ffd5dc" },
  { id: "av13", seed: "Sebastian", bg: "d4edda" },
  { id: "av14", seed: "Natalie",   bg: "fff3cd" },
  { id: "av15", seed: "Theodore",  bg: "e2d9f3" },
  { id: "av16", seed: "Penelope",  bg: "fde8f0" },
  { id: "av17", seed: "Julian",    bg: "d1ecf1" },
  { id: "av18", seed: "Aurora",    bg: "f8d7da" },
];

export const AVATARS = AVATAR_SEEDS;

export function AvatarSVG({ seed, bg, size = 48 }) {
  const url = `https://api.dicebear.com/10.x/notionists/svg?seed=${seed}&backgroundColor=${bg}&backgroundType=solid`;
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