import { Shield, Lock, AlertTriangle, Info, Landmark, Zap, Clock } from "lucide-react";
import { useState } from "react";

export default function BankSyncNotice() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-3">

      {/* Manual Entry Notice */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-300 mb-1">Manual Entry Only</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This app does <strong className="text-foreground">not</strong> connect to your real bank account. All account balances and transactions you see here are manually entered by you and stored securely within this app only. No live bank data is accessed or retrieved.
            </p>
          </div>
        </div>
      </div>

      {/* Legal Disclosure */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <button
          className="w-full flex items-center justify-between text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-sm font-semibold text-foreground">Legal & Privacy Disclosure</p>
          </div>
          <span className="text-xs text-muted-foreground">{expanded ? "Hide ▲" : "View ▼"}</span>
        </button>

        {expanded && (
          <div className="mt-4 space-y-4 text-xs text-muted-foreground leading-relaxed border-t border-border pt-4">

            <section>
              <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-primary" /> Data Storage & Ownership
              </p>
              <p>
                All financial information you enter — including bank account names, balances, and transaction records — is stored exclusively in your personal account database hosted on the Base44 platform. You retain full ownership of your data. This application does not transmit, sell, license, or share your financial data with any third party, advertiser, or financial institution.
              </p>
            </section>

            <section>
              <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Landmark className="w-3 h-3 text-primary" /> No Bank Account Access
              </p>
              <p>
                This application is <strong className="text-foreground">not</strong> a bank, financial institution, or licensed financial advisor. It does not connect to, access, read from, or write to any real bank account, credit union, brokerage, or financial service provider. All data displayed in this app is solely based on information you manually provide. This app is not regulated by the FDIC, FINRA, SEC, or any other financial regulatory authority.
              </p>
            </section>

            <section>
              <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Info className="w-3 h-3 text-primary" /> No Financial Advice
              </p>
              <p>
                The AI assistant (RAYMA) and all content within this application are provided for <strong className="text-foreground">informational and organizational purposes only</strong>. Nothing in this application constitutes professional financial, investment, tax, or legal advice. Always consult a licensed financial professional before making significant financial decisions.
              </p>
            </section>

            <section>
              <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-primary" /> Security
              </p>
              <p>
                Your data is encrypted in transit (TLS/HTTPS) and at rest. Access is restricted to your authenticated account only. You may delete your data at any time. While reasonable security measures are in place, no digital system can guarantee absolute security — you are responsible for maintaining the confidentiality of your login credentials.
              </p>
            </section>

            <section>
              <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-400" /> Accuracy Disclaimer
              </p>
              <p>
                Since all data is entered manually, the accuracy of balances, projections, and financial summaries depends entirely on the information you provide. This app does not verify or validate data against external sources. Always cross-reference with your official bank statements and financial records.
              </p>
            </section>

            <p className="text-[10px] text-muted-foreground/60 pt-2 border-t border-border">
              Last updated: May 2026. By using this application, you acknowledge and agree to the above disclosures.
            </p>
          </div>
        )}
      </div>

      {/* Coming Soon: Bank Sync */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-foreground">Automatic Bank Sync</p>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Coming Soon
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We're working on secure, read-only bank connectivity via a regulated open-banking API (e.g. Plaid or a similar provider). When available, it will allow you to automatically import transactions and balances — with your explicit consent — without ever sharing your banking credentials with this app.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Planned for a future release — no release date confirmed yet.</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}