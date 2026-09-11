import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useT } from "@/lib/LanguageContext";

// Community average rating — aggregate only, no moderation needed.
// Hidden until at least 3 reviews exist so it never looks empty.
export default function FeedbackRatingWidget() {
  const T = useT();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    base44.functions.invoke("getPublicFeedback", {})
      .then((res) => { if (alive) setData(res.data); })
      .catch(() => { if (alive) setData(null); });
    return () => { alive = false; };
  }, []);

  if (!data || !data.count || data.count < 3 || data.avg == null) return null;

  const avg = Number(data.avg).toFixed(1);

  return (
    <button
      onClick={() => navigate("/feedback")}
      className="w-full mb-5 bg-card border border-border rounded-2xl p-4 flex items-center justify-between hover:border-primary/30 transition-colors text-left"
    >
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {T("communityRating", "Community Rating")}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-2xl font-bold font-heading text-foreground">{avg}</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3.5 h-3.5 ${s <= Math.round(data.avg) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {T("fromMembers", "from {n} members").replace("{n}", data.count)} · {T("addYourReview", "Add your review")}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}