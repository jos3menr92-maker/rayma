import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useT } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Headset } from "lucide-react";
import ReactMarkdown from "react-markdown";

const AGENT_NAME = "payment-assistant";

export default function PaymentAssistantChat() {
  const T = useT();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  // Initialize or resume conversation
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const existing = base44.agents.listConversations({ agent_name: AGENT_NAME });
        let conv;
        if (existing && existing.length > 0) {
          conv = existing[0];
        } else {
          conv = base44.agents.createConversation({
            agent_name: AGENT_NAME,
            metadata: { name: "Payment Support", description: "Payment Assistant chat" },
          });
        }
        if (!active) return;
        setConversation(conv);
        setMessages(conv.messages || []);
      } catch {
        if (!active) return;
        setConversation(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !conversation || sending) return;
    setInput("");
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: "user", content: text });
    } catch {
      // error bubbles through subscription
    } finally {
      setSending(false);
    }
  }, [input, conversation, sending]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[420px] rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Headset className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold font-heading text-foreground">
            {T("paymentAssistantTitle", "Rayma AI Payment Assistant")}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {T("paymentAssistantSubtitle", "Payments, billing & refunds")}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-2">
              {T("paymentAssistantGreeting", "Hi! I'm the Payment Assistant. I can help with failed charges, refunds, subscriptions, and receipts. What's the issue?")}
            </p>
          </div>
        )}
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user";
          return (
            <div key={idx} className={isUser ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  isUser
                    ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-3.5 py-2 text-sm"
                    : "max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-sm text-foreground"
                }
              >
                {msg.content && (
                  isUser ? (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none break-words [&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )
                )}
                {msg.tool_calls?.map((tc, i) => (
                  <div key={i} className="mt-1.5 text-[11px] flex items-center gap-1.5 text-muted-foreground">
                    {tc.status === "running" || tc.status === "in_progress" || tc.status === "pending" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : null}
                    <span className="capitalize">{tc.display_projection?.label || tc.name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={T("paymentAssistantPlaceholder", "Describe your payment issue...")}
          className="flex-1 text-sm"
          disabled={sending}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || sending}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}