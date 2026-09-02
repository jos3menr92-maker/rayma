import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Per-category structured attribute definitions.
// Fields not listed here have no type-specific block and render nothing.
const FIELD_SETS = {
  mortgage: [
    { key: "escrow_monthly", labelKey: "escrowMonthly", fallback: "Escrow (monthly)", type: "number" },
    { key: "pmi_monthly", labelKey: "pmiMonthly", fallback: "PMI (monthly)", type: "number" },
    { key: "property_address", labelKey: "propertyAddress", fallback: "Property Address", type: "text" },
    { key: "loan_term_years", labelKey: "loanTermYears", fallback: "Term (years)", type: "number" },
    { key: "rate_type", labelKey: "rateType", fallback: "Rate Type", type: "select", options: [{ v: "fixed", l: "Fixed" }, { v: "adjustable", l: "Adjustable" }] },
  ],
  auto: [
    { key: "vehicle_make", labelKey: "vehicleMake", fallback: "Vehicle Make", type: "text" },
    { key: "vehicle_model", labelKey: "vehicleModel", fallback: "Vehicle Model", type: "text" },
    { key: "vehicle_year", labelKey: "vehicleYear", fallback: "Vehicle Year", type: "number" },
    { key: "vin", labelKey: "vin", fallback: "VIN", type: "text" },
    { key: "collateral_value", labelKey: "collateralValue", fallback: "Collateral Value", type: "number" },
  ],
  credit_card: [
    { key: "credit_limit", labelKey: "creditLimit", fallback: "Credit Limit", type: "number" },
    { key: "available_credit", labelKey: "availableCredit", fallback: "Available Credit", type: "number" },
    { key: "utilization_pct", labelKey: "utilizationPct", fallback: "Utilization (%)", type: "number" },
    { key: "min_payment", labelKey: "minPayment", fallback: "Min Payment", type: "number" },
  ],
  line_of_credit: [
    { key: "credit_limit", labelKey: "creditLimit", fallback: "Credit Limit", type: "number" },
    { key: "draw_amount", labelKey: "drawAmount", fallback: "Draw Amount", type: "number" },
    { key: "available_credit", labelKey: "availableCredit", fallback: "Available Credit", type: "number" },
  ],
  lease: [
    { key: "early_buyout_amount", labelKey: "earlyBuyoutAmount", fallback: "Early Buyout Amount", type: "number" },
    { key: "cash_purchase_price", labelKey: "cashPurchasePrice", fallback: "Cash Purchase Price", type: "number" },
    { key: "total_lease_cost", labelKey: "totalLeaseCost", fallback: "Total Lease Cost", type: "number" },
  ],
  bankruptcy: [
    { key: "case_number", labelKey: "caseNumber", fallback: "Case Number", type: "text" },
    { key: "plan_base", labelKey: "planBase", fallback: "Plan Base Payment", type: "number" },
    { key: "trustee", labelKey: "trustee", fallback: "Trustee", type: "text" },
    { key: "discharge_date", labelKey: "dischargeDate", fallback: "Discharge Date", type: "date" },
    { key: "pct_to_unsecured", labelKey: "pctToUnsecured", fallback: "% to Unsecured", type: "number" },
  ],
};

export default function LoanTypeAttributesFields({ category, attributes = {}, onChange, T }) {
  const fields = FIELD_SETS[category];
  if (!fields) return null;

  function set(key, value) {
    onChange({ ...attributes, [key]: value });
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{T("loanTypeDetails", "Type-specific details")}</p>
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{T(f.labelKey, f.fallback)}</Label>
            {f.type === "select" ? (
              <Select value={attributes[f.key] || ""} onValueChange={(v) => set(f.key, v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder={T("selectOption", "Select")} /></SelectTrigger>
                <SelectContent>
                  {f.options.map((o) => (
                    <SelectItem key={o.v} value={o.v}>{T(`rateType_${o.v}`, o.l)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={f.type}
                step={f.type === "number" ? "0.01" : undefined}
                value={attributes[f.key] ?? ""}
                onChange={(e) => set(f.key, f.type === "number" ? (e.target.value === "" ? "" : parseFloat(e.target.value)) : e.target.value)}
                className="rounded-xl"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}