import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { base44 } from "@/api/base44Client";

function Stars({ n }) {
  return <div className="flex gap-0.5">{Array.from({ length: n }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}</div>;
}

// Landing testimonials: real member reviews approved + featured by the admin.
// Falls back to the illustrative static testimonials until real ones exist.
export default function CommunityTestimonials({ fallbackTestimonials = [] }) {
  const { lang } = useLanguage();
  const T = (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; };
  const [real, setReal] = useState(null);

  useEffect(() => {
    let alive = true;
    base44.functions.invoke("getPublicFeedback", {})
      .then((res) => {
        if (alive) setReal(Array.isArray(res.data?.testimonials) ? res.data.testimonials : []);
      })
      .catch(() => { if (alive) setReal([]); });
    return () => { alive = false; };
  }, []);

  // Still loading — render nothing rather than flash the fallback.
  if (real === null) return null;

  const showReal = real.length > 0;
  const items = showReal ? real : fallbackTestimonials;
  if (items.length === 0) return null;

  return (
    <section id="testimonials" className="py-16">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold font-heading text-foreground mb-3">{T("whatUsersSaying", "What users are saying")}</h2>
          <p className="text-muted-foreground">{T("joinPeople", "Join people around the world tracking their path to financial clarity.")}</p>
          <p className="text-[11px] text-muted-foreground mt-1 italic">
            {showReal
              ? T("verifiedMembersNote", "Real reviews from Rayma AI members.")
              : T("testimonialNote", "Testimonials are illustrative of typical user experiences.")}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {showReal ? items.map((tm, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5">
              <Stars n={tm.rating || 5} />
              <p className="text-sm text-muted-foreground leading-relaxed mt-3 mb-4">"{tm.message}"</p>
              <p className="text-sm font-semibold text-foreground">— {tm.display_name}</p>
            </div>
          )) : items.map((tm) => (
            <div key={tm.nameKey} className="bg-card border border-border rounded-2xl p-5">
              <Stars n={tm.stars} />
              <p className="text-sm text-muted-foreground leading-relaxed mt-3 mb-4">"{T(tm.textKey, tm.text)}"</p>
              <p className="text-sm font-semibold text-foreground">— {T(tm.nameKey, tm.name)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}