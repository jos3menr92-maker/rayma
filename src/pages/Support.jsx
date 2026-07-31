import React, { useState } from "react";
import { motion } from "framer-motion";
import { LifeBuoy, Mail, Phone, Sparkles, Ticket } from "lucide-react";
import { useT } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";
import PaymentAssistantChat from "@/components/support/PaymentAssistantChat";
import SupportTicketForm from "@/components/support/SupportTicketForm";
import SupportTicketList from "@/components/support/SupportTicketList";

export default function Support() {
  const T = useT();
  const [tab, setTab] = useState("assistant");
  const [ticketRefresh, setTicketRefresh] = useState(0);

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-24">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <LifeBuoy className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground mb-1.5">
            {T("supportCenterTitle", "Support Center")}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {T("supportCenterDesc", "Get help with payments, billing, and refunds. Try the AI assistant first — it's the fastest way to resolve most issues.")}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted mb-4">
          <button
            onClick={() => setTab("assistant")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "assistant" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {T("tabAiAssistant", "AI Assistant")}
          </button>
          <button
            onClick={() => setTab("ticket")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "ticket" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Ticket className="w-4 h-4" />
            {T("tabCreateTicket", "Create Ticket")}
          </button>
        </div>

        {/* Tab Content */}
        {tab === "assistant" ? (
          <div className="space-y-4">
            <PaymentAssistantChat />
          </div>
        ) : (
          <SupportTicketForm onCreated={() => setTicketRefresh((k) => k + 1)} />
        )}

        {/* My Tickets */}
        <div className="mt-6">
          <h2 className="text-sm font-semibold font-heading text-foreground mb-2">
            {T("myTickets", "My Tickets")}
          </h2>
          <SupportTicketList refreshKey={ticketRefresh} />
        </div>

        {/* Contact Fallback */}
        <div className="mt-8 rounded-xl border border-dashed border-border p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3 text-center">
            {T("stillNeedHelp", "Still need help? Contact us directly")}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <a href="mailto:rayma.app2026@gmail.com" className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <Mail className="w-4 h-4" />
                <span className="text-xs">rayma.app2026@gmail.com</span>
              </Button>
            </a>
            <a href="tel:+18166142216" className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <Phone className="w-4 h-4" />
                <span className="text-xs">1 816-614-2216</span>
              </Button>
            </a>
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            {T("supportHoursNote", "Email is recommended for the fastest response. Phone hours are limited.")}
          </p>
        </div>
      </motion.div>
    </div>
  );
}