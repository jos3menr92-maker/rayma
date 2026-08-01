import { motion } from "framer-motion";
import { Headset, Database, FlaskConical, CheckCircle2, Bug, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useT } from "@/lib/LanguageContext";
import DiagnosticsConsole from "@/components/diagnostics/DiagnosticsConsole";
import BugCodeSubmission from "@/components/diagnostics/BugCodeSubmission";

const STEPS = [
  { icon: Database, key: "stepScan", fallback: "Scan Tables" },
  { icon: FlaskConical, key: "stepSeed", fallback: "Seed Test Data" },
  { icon: CheckCircle2, key: "stepConfirm", fallback: "Confirm Connection" },
];

export default function RemoteSupport() {
  const T = useT();
  const navigate = useNavigate();

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ChevronLeft className="w-4 h-4" /> {T("back", "Back")}
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Headset className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-heading text-foreground mb-3">
            {T("diagnosticsRepairTitle", "Diagnostics & Repair")}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            {T("diagnosticsRepairDesc", "Scan your data tables, seed test records, and verify your Supabase connection — all in one secure console.")}
          </p>
        </div>

        {/* 3-Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{T(step.key, step.fallback)}</span>
                </div>
                {i < STEPS.length - 1 && <div className="w-6 h-px bg-border mt-[-18px]" />}
              </div>
            );
          })}
        </div>

        {/* Diagnostics Console */}
        <div className="flex justify-center">
          <DiagnosticsConsole />
        </div>

        {/* Bug Code Submission */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Bug className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold font-heading text-foreground">
              {T("submitBugCodeTitle", "Submit Bug Code")}
            </h2>
          </div>
          <BugCodeSubmission />
        </div>

      </motion.div>
    </div>
  );
}