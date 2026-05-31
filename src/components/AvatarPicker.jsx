// Initials-based avatars with professional color palette

const COLORS = [
  "#177cb5", // Teal
  "#d93c5c", // Rose
  "#f49c45", // Orange
  "#6b5b95", // Purple
  "#2ca042", // Green
  "#e74c3c", // Red
  "#3498db", // Blue
  "#9b59b6", // Violet
  "#1abc9c", // Turquoise
  "#f39c12", // Amber
  "#27ae60", // Emerald
  "#e67e22", // Dark Orange
];

function InitialAvatar({ initials, color, size = 48 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: "700",
        color: "#fff",
        userSelect: "none",
      }}
    >
      {initials}
    </div>
  );
}

export function getInitialsColor(name, avatarId) {
  // Deterministic color based on name + id for consistency
  const hash = (name + avatarId).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
}

export default function AvatarPicker({ userName = "", value, onChange }) {
  // Generate 12 avatar options using initials + different colors
  const avatarOptions = COLORS.slice(0, 12).map((color, idx) => {
    const initials = (userName || "?").split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase() || "?";
    const avatarId = `av-${idx}`;
    return { id: avatarId, initials, color };
  });

  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wide">Choose an avatar</p>
      <div className="grid grid-cols-6 gap-2">
        {avatarOptions.map((av) => (
          <button
            key={av.id}
            type="button"
            onClick={() => onChange(av.id)}
            className={`rounded-full transition-all focus:outline-none ${
              value === av.id
                ? "ring-2 ring-primary ring-offset-2 scale-110"
                : "hover:scale-105 opacity-75 hover:opacity-100"
            }`}
            title={`Avatar ${av.id}`}
          >
            <InitialAvatar initials={av.initials} color={av.color} size={44} />
          </button>
        ))}
      </div>
    </div>
  );
}