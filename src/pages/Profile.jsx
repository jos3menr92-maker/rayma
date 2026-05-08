import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { User, Save, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EMOJIS = ["😊", "🦁", "🐻", "🐼", "🦊", "🐸", "🦋", "🌟", "🔥", "💎", "🚀", "🌈", "🎯", "🏆", "💪", "🌻"];

const CURRENCIES = [
  { value: "USD", label: "$ USD — US Dollar" },
  { value: "EUR", label: "€ EUR — Euro" },
  { value: "GBP", label: "£ GBP — British Pound" },
  { value: "CAD", label: "$ CAD — Canadian Dollar" },
  { value: "AUD", label: "$ AUD — Australian Dollar" },
  { value: "JPY", label: "¥ JPY — Japanese Yen" },
  { value: "INR", label: "₹ INR — Indian Rupee" },
  { value: "MXN", label: "$ MXN — Mexican Peso" },
  { value: "BRL", label: "R$ BRL — Brazilian Real" },
];

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    preferred_name: "",
    avatar_emoji: "😊",
    preferred_currency: "USD",
    dashboard_greeting: "",
    pay_frequency: "",
    pay_day: "",
  });

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const me = await base44.auth.me();
    setUser(me);
    setForm({
      preferred_name: me.preferred_name || me.full_name || "",
      avatar_emoji: me.avatar_emoji || "😊",
      preferred_currency: me.preferred_currency || "USD",
      dashboard_greeting: me.dashboard_greeting || "",
      pay_frequency: me.pay_frequency || "",
      pay_day: me.pay_day || "",
    });
    setLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await base44.auth.updateMe(form);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleLogout() {
    base44.auth.logout();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold font-heading text-foreground mb-1">My Profile</h1>
        <p className="text-sm text-muted-foreground mb-6">Personalize your account and dashboard</p>

        {/* Avatar preview */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-4xl mb-2">
            {form.avatar_emoji}
          </div>
          <p className="text-sm font-semibold text-foreground">{form.preferred_name || user?.full_name}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Display name */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Display Name</Label>
            <Input
              value={form.preferred_name}
              onChange={e => setForm(f => ({ ...f, preferred_name: e.target.value }))}
              placeholder={user?.full_name || "Your name"}
              className="mt-1 rounded-xl"
            />
          </div>

          {/* Avatar emoji */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Avatar Emoji</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, avatar_emoji: emoji }))}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    form.avatar_emoji === emoji
                      ? "bg-primary/20 ring-2 ring-primary scale-110"
                      : "bg-muted hover:bg-muted/70"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Preferred Currency</Label>
            <Select value={form.preferred_currency} onValueChange={v => setForm(f => ({ ...f, preferred_currency: v }))}>
              <SelectTrigger className="mt-1 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pay Schedule */}
          <div className="bg-muted/40 border border-border rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">💰 Pay Schedule</p>
            <p className="text-xs text-muted-foreground">Used to remind you to log income and improve cash flow accuracy.</p>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Pay Frequency</Label>
              <Select value={form.pay_frequency} onValueChange={v => setForm(f => ({ ...f, pay_frequency: v, pay_day: "" }))}>
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue placeholder="Select frequency…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.pay_frequency === "weekly" || form.pay_frequency === "biweekly" ? (
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Payday (day of week)</Label>
                <Select value={form.pay_day} onValueChange={v => setForm(f => ({ ...f, pay_day: v }))}>
                  <SelectTrigger className="mt-1 rounded-xl">
                    <SelectValue placeholder="Select day…" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : form.pay_frequency === "monthly" ? (
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Payday (day of month)</Label>
                <Input
                  type="number" min={1} max={31}
                  value={form.pay_day}
                  onChange={e => setForm(f => ({ ...f, pay_day: e.target.value }))}
                  placeholder="e.g. 15"
                  className="mt-1 rounded-xl"
                />
              </div>
            ) : null}
          </div>

          {/* Dashboard greeting */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Dashboard Greeting (optional)</Label>
            <Input
              value={form.dashboard_greeting}
              onChange={e => setForm(f => ({ ...f, dashboard_greeting: e.target.value }))}
              placeholder="e.g. Let's crush that debt!"
              className="mt-1 rounded-xl"
            />
          </div>

          <Button type="submit" disabled={saving} className="w-full rounded-xl h-11">
            {saving ? "Saving..." : saved ? "✓ Saved!" : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
          </Button>
        </form>

        {/* Logout */}
        <div className="mt-6 pt-5 border-t border-border">
          <Button
            variant="outline"
            className="w-full rounded-xl h-11 text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </motion.div>
    </div>
  );
}