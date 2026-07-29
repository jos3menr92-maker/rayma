import { Zap, BatteryCharging, Gamepad2, Battery } from "lucide-react";
import { useT } from "@/lib/LanguageContext";

const TIER_CONFIG = {
  power_generator: {
    labelKey: "tierSponsor",
    labelFallback: "Sponsor",
    icon: Gamepad2,
    classes: "bg-primary/15 text-primary border-primary/40",
  },
  power_lithium: {
    labelKey: "tierLithium",
    labelFallback: "Lithium",
    icon: BatteryCharging,
    classes: "bg-blue-500/15 text-blue-500 border-blue-500/40 dark:text-blue-400",
  },
  free: {
    labelKey: "tierFree",
    labelFallback: "Free",
    icon: Battery,
    classes: "bg-muted text-muted-foreground border-border",
  },
};

export default function PlanBadge({ subscriptionType }) {
  const T = useT();
  const tier = TIER_CONFIG[subscriptionType] || TIER_CONFIG.free;
  const Icon = tier.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${tier.classes}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {T(tier.labelKey, tier.labelFallback)}
    </span>
  );
}