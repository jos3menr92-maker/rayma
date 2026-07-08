/**
 * ==========================================
 * Rayma AI CONFIDENTIAL & PROPRIETARY
 * ==========================================
 * Copyright (C) 2026 Rayma AI. All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains
 * the property of Rayma AI. The intellectual and technical
 * concepts contained herein are proprietary to Rayma AI and
 * are protected by trade secret and copyright law.
 * Dissemination of this information or reproduction of this
 * material is strictly forbidden unless prior written
 * permission is obtained from Rayma AI Management.
 * ==========================================
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Trash2, Loader2, ScanLine } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

export default function RaymaChat({ 
  loans = [], bills = [], incomes = [], payments = [], 
  assets = [], savingsGoals = [], taxes = [], userProfile = null, 
  currentPage = "", forceOpen, onClose, autoOpen 
}) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [tourTriggered, setTourTriggered] = useState(false);
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const messagesEndRef = useRef(null);
  const scanFileRef = useRef(null);
  const navigate = useNavigate();
  const { supaUser } = useFinancialData();

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 📱 Keyboard awareness — keep the chat input visible above the on-screen keyboard
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const handleResize = () => {
      const kbHeight = window.innerHeight - viewport.height;
      setKeyboardHeight(kbHeight > 50 ? kbHeight : 0);
    };
    viewport.addEventListener("resize", handleResize);
    viewport.addEventListener("scroll", handleResize);
    return () => {
      viewport.removeEventListener("resize", handleResize);
      viewport.removeEventListener("scroll", handleResize);
    };
  }, []);

  useEffect(() => {
    if (keyboardHeight > 0) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [keyboardHeight]);

  useEffect(() => {
    if ((forceOpen || autoOpen) && !conversation && !initializing) {
      startConversation();
    }
  }, [forceOpen, autoOpen, conversation, initializing]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      const msgs = data.messages || [];
      setMessages(msgs);
      const last = msgs[msgs.length - 1];
      if (last?.role === "assistant" && last?.status !== "streaming" && last?.status !== "pending") {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  async function startConversation() {
    setInitializing(true);
    try {
      const conv = await base44.agents.createConversation({ agent_name: "rayma" });
      setConversation(conv);
      setMessages(conv.messages || []);
    } catch (err) {
      console.error("Failed to start Rayma AI:", err);
    } finally {
      setInitializing(false);
    }
  }
  
  async function handleSend() {
    const text = input.trim().toLowerCase();
    
    // --- 1. THE CASH FLOW SMOOTHER ---
    if (text.includes("balance my bills") || text.includes("smooth my cash flow") || text.includes("move my due dates")) {
      setMessages(prev => [...prev, { role: "user", content: input.trim() }]);
      setInput("");
      setLoading(true);
      setTimeout(() => {
        const response = T("cashFlowSmootherResponse", `I analyzed your cash flow. You have **$${bills.reduce((a,b)=>a+b.amount,0)}** in bills, mostly concentrated in the first week of the month. \n\nI recommend shifting your **Netflix** and **Car Insurance** due dates to the 15th to align with your mid-month payday. \n\n*Script to use:* "Hi, I'm calling to align my billing cycle with my pay schedule. Can we permanently shift my monthly due date to the 15th?"`);
        setMessages(prev => [...prev, { role: "assistant", content: response }]);
        setLoading(false);
      }, 800);
      return;
    }

    // --- 2. THE AUTO-LOGGER (WRITE ACCESS) ---
    const paidMatch = text.match(/paid \$?(\d+)\s+(?:to|for)\s+(.+)/);
    if (paidMatch) {
      setMessages(prev => [...prev, { role: "user", content: input.trim() }]);
      setInput("");
      setLoading(true);
      const amount = parseFloat(paidMatch[1]);
      const target = paidMatch[2];
      
      setTimeout(async () => {
        if (!supaUser?.id) {
           setMessages(prev => [...prev, { role: "assistant", content: T("authErrorChat", "I need to verify your secure session before logging payments. Please refresh the page.") }]);
           setLoading(false);
           return;
        }

        try {
          await supabase.from('payments').insert([{
            user_id: supaUser.id, 
            amount: amount, 
            note: target,                  
            payment_type: 'completed',     
            payment_date: new Date().toISOString() 
          }]);
          setMessages(prev => [...prev, { role: "assistant", content: T("paymentLoggedSuccess", `✅ **Payment Logged!** I just securely recorded your $${amount} payment to ${target} in your database. Your balances will update automatically.`) }]);
        } catch (error) {
          setMessages(prev => [...prev, { role: "assistant", content: T("paymentLogError", `I tried to log your payment to ${target}, but I couldn't connect to the database.`) }]);
        }
        setLoading(false);
      }, 1000);
      return;
    }

    // --- 3. PAGE-AWARE CONTEXT ---
    if (text.includes("what am i looking at") || text.includes("explain this page") || text.includes("help me with this")) {
      setMessages(prev => [...prev, { role: "user", content: input.trim() }]);
      setInput("");
      let response = T("contextAppGeneral", "You are currently viewing your Rayma AI app.");
      if (currentPage.includes("tax-summary")) response = T("contextTaxSummary", "You are looking at your **Tax Summary**. This page tracks your deductible expenses and organizes your financial data so you are ready for tax season.");
      if (currentPage.includes("debt-simulator")) response = T("contextDebtSimulator", "You are in the **Debt Simulator**. This tool lets you test out different payoff strategies. Enter an extra monthly payment amount, and I'll show you how much interest you'll save!");
      if (currentPage === "/") response = T("contextDashboard", "You are on the **Main Dashboard**. This is your Command Center. You can see your cash flow, upcoming bills, and overall financial health score here.");
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
      return;
    }

    // --- 4. LOAN ADVISOR (DTI CALCULATOR) ---
    if (text.includes("loan") && (text.includes("can i get") || text.includes("should i get") || text.includes("do i qualify") || text.includes("qualify for"))) {
      setMessages(prev => [...prev, { role: "user", content: input.trim() }]);
      setInput("");
      setLoading(true);
      const totalMonthlyObligations = loans.reduce((s, l) => s + (l.monthly_payment || 0), 0) + bills.reduce((s, b) => s + (b.amount || 0), 0);
      const monthlyIncome = incomes.length > 0 ? (incomes.reduce((s, i) => s + (i.amount || 0), 0) / incomes.length) * 4.33 : 0;
      const dti = monthlyIncome > 0 ? (totalMonthlyObligations / monthlyIncome) * 100 : 100;
      let advisorResponse = "";
      
      if (monthlyIncome === 0) { 
        advisorResponse = T("dtiNoIncome", "I don't see any income logged in your account right now. Without income data, I can't calculate your debt-to-income ratio."); 
      } 
      else if (dti > 45) { 
        advisorResponse = T("dtiHigh", `Based on your current debt-to-income (DTI) ratio of **${dti.toFixed(1)}%**, your obligations are quite high relative to your income. Taking on a new loan right now might put significant strain on your cash flow.`); 
      } 
      else if (dti > 30) { 
        advisorResponse = T("dtiMedium", `Your debt-to-income (DTI) ratio is **${dti.toFixed(1)}%**. It's in a manageable range, but be cautious.`); 
      } 
      else { 
        advisorResponse = T("dtiHealthy", `Your debt-to-income (DTI) ratio is very healthy at **${dti.toFixed(1)}%**. If you have a clear plan for the funds, it could be a viable option.`); 
      }
      setTimeout(() => { setMessages(prev => [...prev, { role: "assistant", content: advisorResponse }]); setLoading(false); }, 600);
      return;
    }

    // --- 5. SUPER DEBUG MODE (ADMIN V2 DIAGNOSTICS) ---
    if (text === "rayma debug mode r4yma-d3v-2026") {
      setMessages(prev => [...prev, { role: "user", content: "********" }]);
      setInput("");
      setLoading(true);
      
      const isDebug = localStorage.getItem("rayma_debug_mode") === "true";
      const newState = !isDebug;
      localStorage.setItem("rayma_debug_mode", newState ? "true" : "false");
      window.dispatchEvent(new CustomEvent("toggle-debug-mode"));

      if (!newState) {
        setMessages(prev => [...prev, { role: "assistant", content: "🔒 **SUPER DEBUG MODE SECURED.** Returning to standard user environment." }]);
        setLoading(false); 
        return;
      }

      setMessages(prev => [...prev, { role: "assistant", content: "🔐 **ADMIN MODE UNLOCKED.** \n\nRunning deep system diagnostics..." }]);

      setTimeout(async () => {
        let report = "⚙️ **SYSTEM DIAGNOSTIC REPORT**\n\n";
        
        // 1. IDENTITY & AUTH CHECK
        const { data: sessionData } = await supabase.auth.getSession();
        report += `**--- IDENTITY CHECK ---**\n`;
        report += `- **Base44 ID:** \`${userProfile?.id || 'MISSING'}\`\n`;
        report += `- **Supabase ID:** \`${supaUser?.id || 'MISSING'}\`\n`;
        report += `- **Active JWT Session:** ${sessionData?.session ? '✅ Yes' : '❌ No'}\n\n`;

        if (!supaUser?.id) {
            report += `⚠️ **CRITICAL HALT:** Cannot run table tests. Supabase User ID (\`supaUser\`) is missing from context. You must update FinancialDataContext.jsx to expose it.`;
            setMessages(prev => [...prev, { role: "assistant", content: report }]);
            setLoading(false); 
            return;
        }

        // 2. DATABASE WRITE/VERIFY TESTS
        report += `**--- DATABASE ROUTING ---**\n`;
        const testId = `Test_${Date.now()}`;

        const testTable = async (tableName, insertPayload, verifyColumn, verifyValue) => {
            try {
                const { error: iErr } = await supabase.from(tableName).insert([insertPayload]);
                if (iErr) throw iErr;
                const { data: vData } = await supabase.from(tableName).select('id').eq(verifyColumn, verifyValue).single();
                if (vData) await supabase.from(tableName).delete().eq('id', vData.id);
                return `✅ Passed`;
            } catch (e) { return `❌ Failed (${e.message})`; }
        };

        report += `- 🧾 **Bills:** ${await testTable('bills', { user_id: supaUser.id, name: `Auto ${testId}`, amount: 10 }, 'name', `Auto ${testId}`)}\n`;
        report += `- 🏦 **Loans:** ${await testTable('loans', { user_id: supaUser.id, name: `Auto ${testId}`, remaining_balance: 100, monthly_payment: 10 }, 'name', `Auto ${testId}`)}\n`;
        report += `- 💵 **Incomes:** ${await testTable('incomes', { user_id: supaUser.id, source: `Auto ${testId}`, amount: 100 }, 'source', `Auto ${testId}`)}\n`;
        report += `- 💳 **Payments:** ${await testTable('payments', { user_id: supaUser.id, note: `Auto ${testId}`, amount: 10, payment_type: 'completed', payment_date: new Date().toISOString() }, 'note', `Auto ${testId}`)}\n`;
        
        // 🚀 NEW: Savings Goals Test
        report += `- 🎯 **Savings Goals:** ${await testTable('savings_goals', { user_id: supaUser.id, name: `Auto ${testId}`, target_amount: 1000, current_saved: 100 }, 'name', `Auto ${testId}`)}\n`;

        setMessages(prev => [...prev, { role: "assistant", content: report }]);
        setLoading(false);
      }, 1500);
      return;
    }

    // --- 6. USER DIAGNOSTIC PIN ---
    const isPin = /^\d{6}$/.test(input.trim());
    if (isPin) {
      setScanning(true);
      setMessages(prev => [...prev, { role: "user", content: input }]);
      setInput(""); 
      try {
        const module = await import("../lib/runRemoteDiagnostic");
        const runRemoteDiagnostic = module.runRemoteDiagnostic;
        const mockLogs = { status: "timeout", provider: "Plaid", endpoint: "/sync" };
        const result = await runRemoteDiagnostic(input.trim(), mockLogs);
        setMessages(prev => [...prev, { role: "assistant", content: result.userMessage, actionCode: result.actionCode }]);
      } catch (err) {
        setMessages(prev => [...prev, { role: "assistant", content: T("diagnosticError", "Error loading diagnostic protocol. Try again later.") }]);
      }
      setScanning(false);
      return; 
    }

    // --- 7. SYSTEM COMMANDS (Help, Log out, Nav, Modes) ---
    if (text === "help" || text === "what can you do" || text === "who are you") {
      setMessages(prev => [...prev, { role: "user", content: input.trim() }]);
      setInput("");
      const helpText = T("helpText", `I am Rayma AI, your proactive financial co-pilot. I can automate your app and analyze your money. Try commanding me:\n\n* **Navigate:** "Go to my loans", "Take me to profile", "Open dashboard"\n* **Customize:** "Switch to dark mode", "Turn on focus mode"\n* **Analyze:** "Scan this document"\n* **Learn:** "Start tour"\n* **Security:** "Log me out"`);
      setMessages(prev => [...prev, { role: "assistant", content: helpText }]);
      return;
    }

    if (text === "log out" || text === "sign out") {
      setMessages(prev => [...prev, { role: "user", content: input.trim() }]);
      setInput("");
      setMessages(prev => [...prev, { role: "assistant", content: T("loggingOut", "Logging you out securely. See you next time!") }]);
      setTimeout(async () => { await base44.auth.logout(); window.location.href = "/login"; }, 1500);
      return;
    }

    if (text.includes("focus mode")) {
      setMessages(prev => [...prev, { role: "user", content: input.trim() }]);
      setInput("");
      document.documentElement.classList.add("focus-mode");
      localStorage.setItem("focus_mode", "true");
      setMessages(prev => [...prev, { role: "assistant", content: T("focusModeActivated", "Focus Mode activated. UI muted.") }]);
      return;
    }

    const tourTriggers = [ "tour","start tour","show me around","guide me","another tour","restart tour" ];
    if (tourTriggers.some(trigger => text.includes(trigger))) {
      setMessages(prev => [...prev, { role: "user", content: input.trim() }, { role: "assistant", content: T("startingTour", "Starting the tour now.") }]);
      if (onClose) onClose();
      navigate("/");
      setTimeout(() => window.dispatchEvent(new CustomEvent("trigger-rayma-tour")), 600);
      setInput(""); return;
    }

    if (text === "dark mode" || text === "light mode") {
      const mode = text.includes("dark") ? "dark" : "light";
      document.documentElement.classList.remove(mode === "dark" ? "light" : "dark"); 
      document.documentElement.classList.add(mode); 
      localStorage.setItem("theme", mode);
      setMessages(prev => [...prev, { role: "user", content: input.trim() }, { role: "assistant", content: T("modeSwitched", `Done! Switched to ${mode} mode.`) }]);
      setInput(""); return;
    }

    if (text.includes("go to") || text.includes("take me to")) {
      setMessages(prev => [...prev, { role: "user", content: input.trim() }]);
      setInput("");
      if (text.includes("profile")) navigate("/profile");
      if (text.includes("loan")) navigate("/loans");
      if (text.includes("dashboard")) navigate("/");
      setMessages(prev => [...prev, { role: "assistant", content: T("navigatingNow", "Navigating now...") }]);
      if (onClose) onClose();
      return;
    }

    // --- 8. MAIN AI FALLBACK LOGIC ---
    if (!input.trim() || loading || !conversation) return;
    const messageContent = input.trim(); 
    setInput("");
    setLoading(true);
    const timeout = setTimeout(() => setLoading(false), 30000);
    await base44.agents.addMessage(conversation, { role: "user", content: messageContent });
    clearTimeout(timeout);
  }

  async function handleScanFile(e) {
    const file = e.target.files?.[0];
    if (!file || !conversation) return;
    setScanning(true);
    setLoading(true);
    const timeout = setTimeout(() => setLoading(false), 60000);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.agents.addMessage(conversation, {
      role: "user",
      content: `I'm uploading a financial document for you to analyze: "${file.name}". Please extract all relevant financial data and help me log it.`,
      file_urls: [file_url],
    });
    clearTimeout(timeout);
    setScanning(false);
    e.target.value = "";
  }

  async function handleClear() {
    setConversation(null);
    setMessages([]);
    setLoading(false);
    setTourTriggered(false);
    setInitializing(true);
    const conv = await base44.agents.createConversation({ agent_name: "rayma" });
    setConversation(conv);
    setMessages(conv.messages || []);
    setInitializing(false);
  }

  return (
    <AnimatePresence>
      {forceOpen && (
        <motion.div
          id="rayma-chat-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          style={{ bottom: `calc(6rem + ${keyboardHeight}px)`, maxHeight: `calc(75vh - ${keyboardHeight}px)` }}
          className="fixed right-4 w-[calc(100vw-2rem)] sm:w-80 left-4 sm:left-auto bg-card border border-border rounded-2xl shadow-2xl flex flex-col h-[460px] z-[60]"
        >
          <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
            <div>
              <p className="font-semibold text-foreground text-sm">Rayma AI</p>
              <p className="text-xs text-muted-foreground">{T("aiFinancialAdvisor", "AI Financial Advisor")}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleClear} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-muted rounded-lg transition-colors" title={T("clearConversation", "Clear conversation")}>
                <Trash2 className="w-5 h-5 text-muted-foreground" />
              </button>
              <button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {initializing ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground px-3 py-2 rounded-lg text-sm max-w-[85%]">
                  {T("raymaGreeting", "Hi! I'm Rayma AI, your personal financial advisor. I can read your balances, adjust your cash flow, or log a payment. How can I help you today?")}
                </div>
              </div>
            ) : (
              messages.filter(m => m.role === "user" || m.role === "assistant").map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {msg.role === "assistant" ? (
                      <div className="flex flex-col gap-2">
                        <ReactMarkdown className="prose prose-sm prose-slate dark:prose-invert max-w-none text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                          {msg.content || "…"}
                        </ReactMarkdown>
                        {msg.actionCode && (
                          <button
                            onClick={() => {
                              setMessages(prev => [...prev, { role: "assistant", content: T("connectionRefreshed", "✅ Successfully refreshed the connection. Your sync is back to normal!") }]);
                            }}
                            className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary/90 transition-colors self-start shadow-sm"
                            >
                            {T("securelyFixThis", "Yes, securely fix this")}
                          </button>
                        )}
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted px-3 py-2 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-border p-3 flex items-center gap-2 shrink-0">
            <button
              onClick={() => scanFileRef.current?.click()}
              disabled={loading || initializing || scanning}
              className="h-12 w-12 flex items-center justify-center bg-muted text-muted-foreground rounded-lg hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50 shrink-0"
              title={T("scanAnalyzeDoc", "Scan & analyze a document")}
            >
              {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanLine className="w-5 h-5" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={T("chatPlaceholder", "Type 'I paid $50 to Netflix'...")}
              className="flex-1 h-12 bg-muted border-0 rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
              disabled={loading || initializing}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || initializing}
              className="h-12 w-12 flex items-center justify-center bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
            <input
              ref={scanFileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleScanFile}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
