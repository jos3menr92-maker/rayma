import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useT } from "@/lib/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Loader2, Inbox } from "lucide-react";

const STATUS_STYLES = {
  open: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  resolved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  closed: "bg-muted text-muted-foreground",
};

const PRIORITY_STYLES = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  high: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  urgent: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function SupportTicketList({ refreshKey }) {
  const T = useT();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await base44.entities.SupportTicket.list("-created_date", 50);
        if (active) setTickets(list || []);
      } catch {
        if (active) setTickets([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
        {T("noTicketsYet", "No tickets yet. Create one above or ask the Payment Assistant.")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tickets.map((tk) => (
        <div key={tk.id} className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-muted-foreground">#{tk.ticket_number}</span>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_STYLES[tk.status] || ""}`}>
                  {T(`ticketStatus_${tk.status}`, tk.status)}
                </Badge>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PRIORITY_STYLES[tk.priority] || ""}`}>
                  {T(`ticketPriority_${tk.priority}`, tk.priority)}
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground truncate">{tk.subject}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{tk.description}</p>
            </div>
          </div>
          {tk.resolution_notes && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-[11px] text-muted-foreground mb-0.5">{T("ticketResolution", "Resolution:")}</p>
              <p className="text-xs text-foreground">{tk.resolution_notes}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}