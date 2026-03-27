import { motion } from "framer-motion";

export default function StatsCard({ label, value, icon: Icon, color = "primary", subtitle }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    destructive: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-4 border border-border shadow-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
        {label}
      </p>
      <p className="text-xl font-bold font-heading text-foreground">{value}</p>
      {subtitle && (
        <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </motion.div>
  );
}