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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-3 border border-border shadow-sm"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      </div>
      <p className="text-lg font-bold font-heading text-foreground leading-tight">{value}</p>
      {subtitle && (
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{subtitle}</p>
      )}
    </motion.div>
  );
}