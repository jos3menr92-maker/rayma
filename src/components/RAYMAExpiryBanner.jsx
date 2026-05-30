import { useNavigate } from "react-router-dom";
import { AlertTriangle, XCircle, Heart } from "lucide-react";

/**
 * Shows a banner when RAYMA access is expiring soon (≤14 days) or has expired.
 * Pass raymaExpiresAt (date string) from user profile.
 */
export default function RAYMAExpiryBanner({ raymaExpiresAt }) {
  const navigate = useNavigate();

  if (!raymaExpiresAt) {
    // Never donated — show persistent nudge
    return (
      <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-400/30 rounded-2xl p-3 mb-3">
        <XCircle className="w-4 h-4 text-amber-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">RAYMA is not active</p>
          <p className="text-[11px] text-muted-foreground">AI features are off. A small donation keeps RAYMA running for 6 months.</p>
        </div>
        <button
          onClick={() => navigate("/support")}
          className="shrink-0 text-[11px] font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl transition-colors"
        >
          Donate
        </button>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expires = new Date(raymaExpiresAt + "T00:00:00");
  const daysLeft = Math.ceil((expires - today) / (1000 * 60 * 60 * 24));

  if (daysLeft > 14) return null; // Plenty of time left, no banner

  const isExpired = daysLeft <= 0;

  if (isExpired) {
    return (
      <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-2xl p-3 mb-3">
        <XCircle className="w-4 h-4 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">RAYMA has stopped</p>
          <p className="text-[11px] text-muted-foreground">Your donation period ended. Renew to restore AI features.</p>
        </div>
        <button
          onClick={() => navigate("/support")}
          className="shrink-0 text-[11px] font-semibold bg-destructive hover:bg-destructive/90 text-white px-3 py-1.5 rounded-xl transition-colors"
        >
          Renew
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-400/30 rounded-2xl p-3 mb-3">
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">RAYMA expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}</p>
        <p className="text-[11px] text-muted-foreground">Donate to keep AI features running — costs money to operate.</p>
      </div>
      <button
        onClick={() => navigate("/support")}
        className="shrink-0 text-[11px] font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl transition-colors"
      >
        Renew
      </button>
    </div>
  );
}