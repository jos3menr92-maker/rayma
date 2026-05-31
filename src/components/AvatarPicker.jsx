// Notionists style — professional illustrated portraits with varied skin & clothing colors

const AVATAR_SEEDS = [
  { id: "av1",  seed: "Alexander", bg: "b6e3f4", skin: "f5cfa0", clothing: "5bc8af" },
  { id: "av2",  seed: "Charlotte", bg: "ffd5dc", skin: "d78774", clothing: "e07b9a" },
  { id: "av3",  seed: "Benjamin",  bg: "c0aede", skin: "ae8f6f", clothing: "6c63ff" },
  { id: "av4",  seed: "Olivia",    bg: "d1f4e0", skin: "f5cfa0", clothing: "43aa8b" },
  { id: "av5",  seed: "Harrison",  bg: "ffdfba", skin: "7c4a1e", clothing: "f4a261" },
  { id: "av6",  seed: "Sophia",    bg: "fde8f0", skin: "fddcb5", clothing: "e9637a" },
  { id: "av7",  seed: "Marcus",    bg: "d1ecf1", skin: "ae8f6f", clothing: "457b9d" },
  { id: "av8",  seed: "Isabella",  bg: "d1f4e0", skin: "d78774", clothing: "2a9d8f" },
  { id: "av9",  seed: "Nathan",    bg: "e2d9f3", skin: "f5cfa0", clothing: "7b2d8b" },
  { id: "av10", seed: "Victoria",  bg: "fff3cd", skin: "fddcb5", clothing: "e9c46a" },
  { id: "av11", seed: "Ethan",     bg: "e8f4fd", skin: "7c4a1e", clothing: "264653" },
  { id: "av12", seed: "Amelia",    bg: "ffd5dc", skin: "ae8f6f", clothing: "e76f51" },
  { id: "av13", seed: "Sebastian", bg: "d4edda", skin: "fddcb5", clothing: "2b9348" },
  { id: "av14", seed: "Natalie",   bg: "fff3cd", skin: "d78774", clothing: "f77f00" },
  { id: "av15", seed: "Theodore",  bg: "e2d9f3", skin: "7c4a1e", clothing: "9b5de5" },
  { id: "av16", seed: "Penelope",  bg: "fde8f0", skin: "f5cfa0", clothing: "d62246" },
  { id: "av17", seed: "Julian",    bg: "d1ecf1", skin: "ae8f6f", clothing: "118ab2" },
  { id: "av18", seed: "Aurora",    bg: "f8d7da", skin: "fddcb5", clothing: "c77dff" },
];

export const AVATARS = AVATAR_SEEDS;

export function AvatarSVG({ seed, bg, skin, clothing, size = 48 }) {
  const params = new URLSearchParams({
    seed,
    backgroundColor: bg,
    backgroundType: "solid",
    ...(skin ? { skinColor: skin } : {}),
    ...(clothing ? { clothesColor: clothing } : {}),
  });
  const url = `https://api.dicebear.com/10.x/notionists/svg?${params}`;
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