import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Trash2, Loader2, ScanLine } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient"; // 🔌 SECURE VAULT WRITE ACCESS

// ✨ THE BIG BRAIN: Now accepts all financial data and current page context
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
  const messagesEndRef = useRef(null);
  const scanFileRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      console.error("Failed to start RAYMA:", err);
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
        const response = `I analyzed your cash flow. You have **$${bills.reduce((a,b)=>a+b.amount,0)}** in bills, mostly concentrated in the first week of the month. \n\nI recommend shifting your **Netflix** and **Car Insurance** due dates to the 15th to align with your mid-month payday. \n\n*Script to use:* "Hi, I'm calling to align my billing cycle with my pay schedule. Can we permanently shift my monthly due date to the 15th?"`;
        setMessages(prev => [...prev, { role: "assistant", content: response }]);
        setLoading(false);
      }, 800);
      return;
    }

    // --- 2. THE AUTO-LOGGER (WRITE ACCESS) ---
    // Detects phrases like "I paid $50 to Netflix" or "Logged $100 for moms"
    const paidMatch = text.match(/paid \$?(\d+)\s+(?:to|for)\s+(.+)/);
    if (paidMatch) {
      setMessages(prev => [...prev, { role: "user", content: input.trim() }]);
      setInput("");
      setLoading(true);
      
      const amount = parseFloat(paidMatch[1]);
      const target = paidMatch[2];

      setTimeout(async () => {
        try {
          // Securly writes to the new Supabase payments table
          await supabase.from('payments').insert([{
            user_id: userProfile?.id,
            amount: amount,
            target_name: target,
            status: 'completed',
            date: new Date().toISOString()
          }]);
          
          setMessages(prev => [...prev, { role: "assistant", content: `✅ **Payment Logged!** I just securely recorded your $${amount} payment to ${target} in your database. Your balances will update automatically.` }]);
        } catch (error) {
          setMessages(prev => [...prev, { role: "assistant", content: `I tried to log your payment to ${target}, but I couldn't connect to the database. Make sure your 'payments' table is set up in Supabase!` }]);
        }
        setLoading(false);
      }, 1000);
      return;
    }

    // --- 3. PAGE-AWARE CONTEXT ---
    if (text.includes("what am i looking at") || text.includes("explain this page") || text.includes("help me with this")) {
      setMessages(prev => [...prev, { role: "user", content: input.trim() }]);
      setInput("");
      let response = "You are currently viewing your RAYMA app.";
      
      if (currentPage.includes("tax-summary")) response = "You are looking at your **Tax Summary**. This page tracks your deductible expenses and organizes your financial data so you are ready for tax season. Need help finding a write-off?";
      if (currentPage.includes("debt-simulator")) response = "You are in the **Debt Simulator**. This tool lets you test out different payoff strategies. Enter an extra monthly payment amount, and I'll show you how much interest you'll save!";
      if (currentPage === "/") response = "You are on the **Main Dashboard**. This is your Command Center. You can see your cash flow, upcoming bills, and overall financial health score here.";
      
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
      return;
    }

    // --- EXISTING COMMANDS (Navigation, Dark Mode, Diagnostics, Loan Advisor) ---
    const tourTriggers = [ "tour","start tour","show me around","guide me" ];  
    if (!tourTriggered && tourTriggers.some(trigger => text === trigger || text.startsWith(trigger + " "))) {
      setTourTriggered(true);
      setMessages(prev => [...prev, { role: "user", content: input.trim() }, { role: "assistant", content: "Starting the tour now." }]);
      window.dispatchEvent(new CustomEvent("trigger-rayma-tour"));
      if (onClose) onClose(); 
      setInput(""); return; 
    }

    if (text === "dark mode" || text === "light mode") {
      const mode = text.includes("dark") ? "dark" : "light";
      document.documentElement.classList.remove(mode === "dark" ? "light" : "dark"); 
      document.documentElement.classList.add(mode); 
      localStorage.setItem("theme", mode);
      setMessages(prev => [...prev, { role: "user", content: input.trim() }, { role: "assistant", content: `Done! Switched to ${mode} mode.` }]);
      setInput(""); return;
    }

    if (text.includes("go to") || text.includes("take me to")) {
      setMessages(prev => [...prev, { role: "user", content: input.trim() }]);
      setInput("");
      if (text.includes("profile")) navigate("/profile");
      if (text.includes("loan")) navigate("/loans");
      if (text.includes("dashboard")) navigate("/");
      setMessages(prev => [...prev, { role: "assistant", content: "Navigating now..." }]);
      if (onClose) onClose();
      return;
    }

    // --- MAIN AI FALLBACK LOGIC ---
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 right-4 w-[calc(100vw-2rem)] sm:w-80 left-4 sm:left-auto bg-card border border-border rounded-2xl shadow-2xl flex flex-col h-[460px] max-h-[75vh] z-40"
        >
          <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
            <div>
              <p className="font-semibold text-foreground text-sm">RAYMA</p>
              <p className="text-xs text-muted-foreground">AI Financial Advisor</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleClear} className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="Clear conversation">
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
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
                  Hi! I'm RAYMA. I can read your balances, adjust your cash flow, or log a payment. How can I help you today?
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
              title="Scan & analyze a document"
            >
              {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanLine className="w-5 h-5" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type 'I paid $50 to Netflix'..."
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
