// Detailed flat-illustration portrait avatars using DiceBear avataaars style
// Each avatar is a unique combination of seed + style options

const AVATAR_SEEDS = [
  { id: "av1",  seed: "Felix",     bg: "#d4e8f0" },
  { id: "av2",  seed: "Sophia",    bg: "#fde8e8" },
  { id: "av3",  seed: "Marcus",    bg: "#e8eaf6" },
  { id: "av4",  seed: "Aisha",     bg: "#fff3e0" },
  { id: "av5",  seed: "Leila",     bg: "#e8f5e9" },
  { id: "av6",  seed: "Carlos",    bg: "#fce4ec" },
  { id: "av7",  seed: "Yuki",      bg: "#e3f2fd" },
  { id: "av8",  seed: "Tariq",     bg: "#f3e5f5" },
  { id: "av9",  seed: "Elena",     bg: "#e0f7fa" },
  { id: "av10", seed: "Jordan",    bg: "#fff8e1" },
  { id: "av11", seed: "Priya",     bg: "#fbe9e7" },
  { id: "av12", seed: "Samuel",    bg: "#e8f5e9" },
];

export const AVATARS = AVATAR_SEEDS;

export function AvatarSVG({ id, seed, bg, size = 48 }) {
  const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=${bg.replace("#","")}&backgroundType=circle&radius=50`;
  return (
    <img
      src={url}
      alt={seed}
      width={size}
      height={size}
      style={{ borderRadius: "50%", background: bg }}
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
            className={`rounded-full transition-all focus:outline-none ${
              value === av.id
                ? "ring-2 ring-primary ring-offset-2 scale-110"
                : "hover:scale-105 opacity-80 hover:opacity-100"
            }`}
            style={{ background: av.bg }}
            title={av.seed}
          >
            <AvatarSVG {...av} size={44} />
          </button>
        ))}
      </div>
    </div>
  );
}