import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ArrowLeft, Landmark, Calendar, Percent, ShieldAlert, BadgeDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

export default function AddLoan() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const T = (key, fallback) => t(lang, key) !== key ? t(lang, key) : fallback;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    loan_name: "",
    lender: "",
    principal_amount: "",
    interest_rate: "",
    monthly_payment: "",
    start_date: "",
  });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.loan_name || !form.principal_amount) {
      setError(T("errorFillNameAmount", "Please fill out the loan name and principal amount."));
      return;
    }

    try {
      setLoading(true);
      setError("");
      await base44.entities.Loan.create({
        name: form.loan_name,
        lender: form.lender,
        principal: parseFloat(form.principal_amount) || 0,
        interest_rate: parseFloat(form.interest_rate) || 0,
        monthly_payment: parseFloat(form.monthly_payment) || 0,
        start_date: form.start_date,
      });
      navigate("/debt-simulator");
    } catch (err) {
      console.error(err);
      setError(T("errorSaveFailed", "Failed to save loan. Please check your network connection."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      {/* Back Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{T("addNewLoan", "Add New Loan")}</h1>
          <p className="text-xs text-muted-foreground">{T("trackLiability", "Track a new liability or line of credit")}</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-destructive/5 border border-destructive/20 rounded-2xl p-4 flex gap-3 items-start text-destructive">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-xs font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">{T("loanName", "Loan Name")}</Label>
            <div className="relative mt-1">
              <BadgeDollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input value={form.loan_name} onChange={e => setForm(f => ({ ...f, loan_name: e.target.value }))} placeholder={T("loanNameExample", "e.g. Car Loan, Student Debt")} className="pl-10 rounded-xl" />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground">{T("lender", "Lender / Institution")}</Label>
            <div className="relative mt-1">
              <Landmark className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input value={form.lender} onChange={e => setForm(f => ({ ...f, lender: e.target.value }))} placeholder={T("lenderExample", "e.g. Chase, Sallie Mae")} className="pl-10 rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">{T("principalAmount", "Principal Amount")}</Label>
              <Input type="number" step="any" value={form.principal_amount} onChange={e => setForm(f => ({ ...f, principal_amount: e.target.value }))} placeholder="0.00" className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">{T("interestRate", "Interest Rate (%)")}</Label>
              <div className="relative mt-1">
                <Percent className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input type="number" step="any" value={form.interest_rate} onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))} placeholder="0.00" className="pr-10 rounded-xl" />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground">{T("monthlyPayment", "Monthly Minimum Payment")}</Label>
            <Input type="number" step="any" value={form.monthly_payment} onChange={e => setForm(f => ({ ...f, monthly_payment: e.target.value }))} placeholder="0.00" className="mt-1 rounded-xl" />
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground">{T("startDate", "Loan Start Date")}</Label>
            <div className="relative mt-1">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="pl-10 rounded-xl flex-row-reverse" />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full rounded-xl h-11 font-semibold">
          {loading ? T("savingLoan", "Saving Loan...") : T("addLoan", "Add Loan")}
        </Button>
      </form>
    </div>
  );
}
