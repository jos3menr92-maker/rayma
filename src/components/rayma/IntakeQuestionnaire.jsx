import { useState } from "react";
import { useT } from "@/lib/LanguageContext";

/**
 * IntakeQuestionnaire — 3 quick questions before any premium review
 * (Deep Financial Review + Plan Re-Review). Only asks what logged data can
 * never reveal: who depends on the user, once-in-a-while costs, and income
 * steadiness. If saved answers exist in memory, it first shows them with a
 * "still accurate?" check instead of re-interviewing.
 */
const HOUSEHOLD_OPTS = [
  { value: "just_me", key: "intakeQ1JustMe" },
  { value: "partner", key: "intakeQ1Partner" },
  { value: "kids", key: "intakeQ1Kids" },
  { value: "kids_pets", key: "intakeQ1KidsPets" },
  { value: "support_family", key: "intakeQ1Family" },
];
const OCCASIONAL_OPTS = [
  { value: "holiday_travel", key: "intakeQ2Travel" },
  { value: "car_maintenance", key: "intakeQ2Car" },
  { value: "remittances", key: "intakeQ2Remit" },
  { value: "annual_taxes", key: "intakeQ2Annual" },
];
const INCOME_OPTS = [
  { value: "steady", key: "intakeQ3Steady" },
  { value: "variable", key: "intakeQ3Variable" },
  { value: "freelance_seasonal", key: "intakeQ3Swings" },
];

export default function IntakeQuestionnaire({ saved = null, onComplete, onCancel }) {
  const T = useT();
  const [confirming, setConfirming] = useState(!!saved);
  const [household, setHousehold] = useState(saved?.household || "");
  const [occasional, setOccasional] = useState(Array.isArray(saved?.occasional) ? [...saved.occasional] : []);
  const [income, setIncome] = useState(saved?.income || "");

  const label = (opts, value) => {
    const o = opts.find((x) => x.value === value);
    return o ? T(o.key, o.value) : value;
  };

  // Confirm mode — show what Rayma remembers, ask only "has anything changed?"
  if (confirming && saved) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-muted rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">{T("intakeStillAccurate", "Still accurate?")}</p>
          <p className="text-xs text-muted-foreground">{T("intakeRemembered", "Last time you told me:")}</p>
          <ul className="space-y-1 text-xs text-foreground">
            {saved.household && <li>• {label(HOUSEHOLD_OPTS, saved.household)}</li>}
            {Array.isArray(saved.occasional) && saved.occasional.length > 0 && (
              <li>• {saved.occasional.map((v) => label(OCCASIONAL_OPTS, v)).join(", ")}</li>
            )}
            {saved.income && <li>• {label(INCOME_OPTS, saved.income)}</li>}
          </ul>
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => onComplete?.({ ...saved })}
              className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold active:scale-95 transition-transform"
            >
              {T("intakeNoChange", "No, still accurate")}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="w-full bg-muted text-foreground border border-border rounded-lg py-2.5 text-sm font-semibold active:scale-95 transition-transform"
            >
              {T("intakeChanged", "Something changed")}
            </button>
            <button onClick={onCancel} className="text-xs text-muted-foreground underline py-1">
              {T("intakeCancel", "Cancel review")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const toggleOccasional = (value) => {
    setOccasional((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };
  const chipClass = (active) =>
    `px-3 py-2 rounded-full text-xs font-medium border transition-colors ${
      active ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-foreground border-border"
    }`;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      <div>
        <p className="text-sm font-semibold text-foreground">{T("intakeTitle", "Quick check before your review")}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {T("intakeSubtitle", "Three things your logged data can't tell me — they make your plan realistic.")}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">{T("intakeQ1", "Who depends on your income?")}</p>
        <div className="flex flex-wrap gap-2">
          {HOUSEHOLD_OPTS.map((o) => (
            <button key={o.value} onClick={() => setHousehold(o.value)} className={chipClass(household === o.value)}>
              {T(o.key, o.value)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">
          {T("intakeQ2", "Big once-in-a-while costs to plan for?")}
        </p>
        <div className="flex flex-wrap gap-2">
          {OCCASIONAL_OPTS.map((o) => (
            <button key={o.value} onClick={() => toggleOccasional(o.value)} className={chipClass(occasional.includes(o.value))}>
              {T(o.key, o.value)}
            </button>
          ))}
          <button onClick={() => setOccasional([])} className={chipClass(occasional.length === 0)}>
            {T("intakeQ2None", "None of these")}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">{T("intakeQ3", "Is your income steady?")}</p>
        <div className="flex flex-wrap gap-2">
          {INCOME_OPTS.map((o) => (
            <button key={o.value} onClick={() => setIncome(o.value)} className={chipClass(income === o.value)}>
              {T(o.key, o.value)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <button
          onClick={() => onComplete?.({ household, occasional, income, _id: saved?._id })}
          disabled={!household || !income}
          className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
        >
          {T("intakeContinue", "Continue")}
        </button>
        <button
          onClick={() => onComplete?.(null)}
          className="w-full bg-muted text-foreground border border-border rounded-lg py-2.5 text-sm font-semibold active:scale-95 transition-transform"
        >
          {T("intakeSkip", "Skip — use what you know")}
        </button>
        <button onClick={onCancel} className="text-xs text-muted-foreground underline py-1">
          {T("intakeCancel", "Cancel review")}
        </button>
      </div>
    </div>
  );
}