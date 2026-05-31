const AVATARS = [
  // style: shape variant (0-2), color variant
  { id: "av1", bg: "#0D9488", skin: "#FCD9BD", hair: "#1F2937", style: 0 },
  { id: "av2", bg: "#6366F1", skin: "#FCD9BD", hair: "#111827", style: 1 },
  { id: "av3", bg: "#0EA5E9", skin: "#F5CBA7", hair: "#7C3AED", style: 0 },
  { id: "av4", bg: "#EC4899", skin: "#FDDCB5", hair: "#1F2937", style: 2 },
  { id: "av5", bg: "#F59E0B", skin: "#C68642", hair: "#111827", style: 1 },
  { id: "av6", bg: "#10B981", skin: "#8D5524", hair: "#111827", style: 0 },
  { id: "av7", bg: "#8B5CF6", skin: "#FCD9BD", hair: "#92400E", style: 2 },
  { id: "av8", bg: "#EF4444", skin: "#F5CBA7", hair: "#1F2937", style: 1 },
  { id: "av9", bg: "#334155", skin: "#FDDCB5", hair: "#111827", style: 0 },
  { id: "av10", bg: "#0891B2", skin: "#C68642", hair: "#7C3AED", style: 2 },
  { id: "av11", bg: "#059669", skin: "#8D5524", hair: "#111827", style: 1 },
  { id: "av12", bg: "#7C3AED", skin: "#FCD9BD", hair: "#1F2937", style: 2 },
];

function AvatarSVG({ bg, skin, hair, style, size = 48 }) {
  // style 0: short hair, neutral
  // style 1: longer hair
  // style 2: curly / afro-ish

  const cx = size / 2;
  const headR = size * 0.22;
  const headY = size * 0.34;
  const bodyY = size * 0.58;

  const hairPaths = {
    0: (
      // Short straight hair cap
      <ellipse cx={cx} cy={headY - headR * 0.3} rx={headR * 1.05} ry={headR * 0.65} fill={hair} />
    ),
    1: (
      // Longer side hair
      <>
        <ellipse cx={cx} cy={headY - headR * 0.2} rx={headR * 1.1} ry={headR * 0.7} fill={hair} />
        <rect x={cx - headR * 1.05} y={headY - headR * 0.1} width={headR * 0.3} height={headR * 1.0} rx={headR * 0.15} fill={hair} />
        <rect x={cx + headR * 0.75} y={headY - headR * 0.1} width={headR * 0.3} height={headR * 1.0} rx={headR * 0.15} fill={hair} />
      </>
    ),
    2: (
      // Curly / round afro
      <ellipse cx={cx} cy={headY - headR * 0.1} rx={headR * 1.25} ry={headR * 0.95} fill={hair} />
    ),
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx={cx} cy={cx} r={cx} fill={bg} />

      {/* Body / shoulders */}
      <ellipse cx={cx} cy={size * 0.88} rx={size * 0.28} ry={size * 0.22} fill={skin} opacity="0.9" />

      {/* Hair (behind head) */}
      {hairPaths[style]}

      {/* Head */}
      <circle cx={cx} cy={headY} r={headR} fill={skin} />

      {/* Clip to circle */}
      <circle cx={cx} cy={cx} r={cx} fill="transparent" />
    </svg>
  );
}

export default function AvatarPicker({ value, onChange }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-3 uppercase tracking-wide font-medium">Or choose an avatar</p>
      <div className="grid grid-cols-6 gap-2">
        {AVATARS.map((av) => (
          <button
            key={av.id}
            type="button"
            onClick={() => onChange(av.id)}
            className={`rounded-xl overflow-hidden transition-all flex items-center justify-center ${
              value === av.id
                ? "ring-2 ring-primary ring-offset-2 scale-110"
                : "opacity-80 hover:opacity-100 hover:scale-105"
            }`}
            style={{ width: 48, height: 48 }}
          >
            <AvatarSVG {...av} size={48} />
          </button>
        ))}
      </div>
    </div>
  );
}

export { AVATARS, AvatarSVG };