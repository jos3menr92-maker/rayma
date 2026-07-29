import React, { useState, useEffect, useMemo } from "react";
import { Mail, Plus, Trash2, Loader2, MailCheck, MailX } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function AdminEmailManager() {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);

  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => { loadEmails(); }, []);

  async function loadEmails() {
    setLoading(true);
    try {
      const list = await base44.entities.AdminEmail.list("-created_date", 50);
      setEmails(list || []);
    } catch (err) {
      console.error("Failed to load admin emails:", err);
    }
    setLoading(false);
  }

  async function handleAdd() {
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      await base44.entities.AdminEmail.create({
        email: newEmail.trim(),
        label: newLabel.trim() || null,
        is_active: true
      });
      setNewEmail("");
      setNewLabel("");
      loadEmails();
    } catch (err) {
      alert(T("addEmailError", "Failed to add email: ") + (err.message || ""));
    }
    setAdding(false);
  }

  async function handleToggle(id, currentActive) {
    try {
      await base44.entities.AdminEmail.update(id, { is_active: !currentActive });
      loadEmails();
    } catch (err) {
      console.error("Failed to toggle:", err);
    }
  }

  async function handleDelete(id) {
    try {
      await base44.entities.AdminEmail.delete(id);
      loadEmails();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">{T("supportEmails", "Support Emails")}</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {T("supportEmailsDesc", "Bug reports submitted from Diagnostics & Repair are emailed to these addresses.")}
      </p>

      {/* Add new email */}
      <div className="flex flex-col gap-2 mb-4">
        <input
          type="email"
          placeholder={T("emailAddress", "Email address")}
          className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm w-full"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
        <input
          type="text"
          placeholder={T("labelOptional", "Label (optional)")}
          className="bg-background border border-border rounded-xl px-4 py-2.5 text-sm w-full"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        <Button onClick={handleAdd} disabled={!newEmail.trim() || adding} className="rounded-xl h-10 gap-2 text-sm">
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {T("addEmail", "Add Email")}
        </Button>
      </div>

      {/* Email list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : emails.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">{T("noEmailsYet", "No support emails configured yet.")}</p>
      ) : (
        <div className="space-y-2">
          {emails.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-background border border-border rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                {item.is_active ? <MailCheck className="w-4 h-4 text-primary shrink-0" /> : <MailX className="w-4 h-4 text-muted-foreground shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.email}</p>
                  {item.label && <p className="text-[10px] text-muted-foreground truncate">{item.label}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={item.is_active} onCheckedChange={() => handleToggle(item.id, item.is_active)} />
                <button onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}