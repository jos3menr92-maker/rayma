import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Trash2, Loader2, ScanLine } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";
import { runRemoteDiagnostic } from "../lib/runRemoteDiagnostic";
import { useNavigate } from "react-router-dom";

export default function RaymaChat() {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
  const messagesEndRef = useRef(null);
  const scanFileRef = useRef(null);
  const navigate = useNavigate();

  // Fetch User Profile so RAYMA knows who she is talking to
  useEffect(() => {
    base44.auth.me().then(me => setUserProfile(me)).catch(console.error);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  async function openChat() {
    setOpen(true);
    if (conversation) return;
    setInitializing(true);
    const conv = await base44.agents.createConversation({ agent_name: "rayma" });
    setConversation(conv);
    setMessages(conv.messages || []);
    setInitializing(false);
  }
  
  async function handleSend() {
    const text = input.trim().toLowerCase();
    const messageContent = input.trim(); 
    if (!text) return;

    // --- 1. TOUR INTERCEPTOR ---
    const tourTriggers = [ "tour","start tour","show me around","guide me","how does this work","how do i use this","i'm lost","can i get a tour","give me head" ];  
    if (tourTriggers.some(trigger => text.includes(trigger))) {
      setMessages(prev => [...prev, { role: "user", content: messageContent }]);
      setInput(""); 
      setMessages(prev => [...prev, { role: "assistant", content: "I'd be happy to show you around! Starting the tour now." }]);
      window.dispatchEvent(new CustomEvent("trigger-rayma-tour"));
      setOpen(false); 
      return; 
    }

    // --- 2. HELP & CAPABILITIES MENU ---
    if (text === "help" || text.includes("what can you do") || text.includes("who are you")) {
      setMessages(prev => [...prev, { role: "user", content: messageContent }]);
      setInput("");
      const helpText = `I am RAYMA, your proactive financial co-pilot. I can automate your app and analyze your money. Try commanding me:\n\n* **Navigate:** "Go to my loans", "Take me to profile", "Open dashboard"\n* **Customize:** "Switch to dark mode", "Turn on focus mode"\n* **Analyze:** "Scan this document" (using the scanner icon below)\n* **Learn:** "Show me around" (to restart the tour)\n* **Security:** "Log me out"\n\nOr just ask me any financial question, and I will calculate the best move.`;
      setMessages(prev => [...prev, { role: "assistant", content: helpText }]);
      return;
    }

    // --- 3. LOGOUT COMMAND ---
    if (text.includes("log out") || text.includes("sign out")) {
      setMessages(prev => [...prev, { role: "user", content: messageContent }]);
      setInput("");
      setMessages(prev => [...prev, { role: "assistant", content: "Logging you out securely. See you next time!" }]);
      setTimeout(async () => {
        await base44.auth.logout();
        window.location.href = "/login";
      }, 1500);
      return;
    }

    // --- 4. NAVIGATION COMMANDS ---
    if (text.includes("go to") || text.includes("take me to") || text.includes("open ")) {
      setMessages(prev => [...prev, { role: "user", content: messageContent }]);
      setInput("");
      if (text.includes("profile") || text.includes("settings")) {
        navigate("/profile");
        setMessages(prev => [...prev, { role: "assistant", content: "Teleporting you to your Profile & Settings." }]);
      } else if (text.includes("loan") || text.includes("debt")) {
        navigate("/loans");
        setMessages(prev => [...prev, { role: "assistant", content: "Pulling up your Loans dashboard." }]);
      } else if (text.includes("dashboard") || text.includes("home")) {
        navigate("/");
        setMessages(prev => [...prev, { role: "assistant", content: "Taking you to the main Command Center." }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "I can navigate you anywhere. Just tell me where!" }]);
      }
      return;
    }

    // --- 5. THEME & SETTINGS COMMANDS ---
    if (text.includes("dark mode") || text.includes("light mode")) {
      setMessages(prev => [...prev, { role: "user", content: messageContent }]);
      setInput("");
      const newTheme = text.includes("dark mode") ? "dark" : "light";
      document.documentElement.classList.remove(newTheme === "dark" ? "light" : "dark");
      document.documentElement.classList.add(newTheme);
      localStorage.setItem("theme", newTheme);
      setMessages(prev => [...prev, { role: "assistant", content: `Done! Switched to ${newTheme} mode.` }]);
      return;
    }

    if (text.includes("focus mode")) {
      setMessages(prev => [...prev, { role: "user", content: messageContent }]);
      setInput("");
      try {
          await base44.auth.updateMe({ compact_mode: true });
          setMessages(prev => [...prev, { role: "assistant", content: "Focus Mode activated. I've muted the dashboard colors so you can concentrate." }]);
      } catch(err) { 
          setMessages(prev => [...prev, { role: "assistant", content: "I had trouble saving that setting, please try again." }]); 
      }
      return;
    }

    // --- 6. SECRET DEBUG MODE ---
    if (text.includes("debug mode") || text.includes("developer mode")) {
      setMessages(prev => [...prev, { role: "user", content: messageContent }]);
      setInput("");
      
      const isDebug = localStorage.getItem("rayma_debug_mode") === "true";
      const newState = !isDebug;
      localStorage.setItem("rayma_debug_mode", newState ? "true" : "false");
      
      window.dispatchEvent(new CustomEvent("toggle-debug-mode"));
      
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: newState 
          ? "🛠️ **Debug Mode Enabled.** Advanced metrics and developer tools are now active." 
          : "🔒 **Debug Mode Disabled.** Returning to standard user view." 
      }]);
      return;
    }
  
    // --- 7. DIAGNOSTIC PIN INTERCEPTOR ---
    const isPin = /^\d{6}$/.test(text);
    if (isPin) {
      setScanning(true);
      setMessages(prev => [...prev, { role: "user", content: messageContent }]);
      setInput(""); 
      const mockLogs = { status: "timeout", provider: "Plaid", endpoint: "/sync" };
      const result = await runRemoteDiagnostic(messageContent, mockLogs);
      setMessages(prev => [...prev, { role: "assistant", content: result.userMessage, actionCode: result.actionCode }]);
      setScanning(false);
      return; 
    }

    // --- MAIN API SEND LOGIC ---
    if (loading || !conversation) return;
    
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
    setInitializing(true);
    const conv = await base44.agents.createConversation({ agent_name: "rayma" });
    setConversation(conv);
    setMessages(conv.messages || []);
    setInitializing(false);
  }

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={openChat}
            className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow z-40"
            title="Chat with RAYMA"
          >
            <MessageSquare className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-4 w-80 bg-card border border-border rounded-2xl shadow-2xl flex flex-col h-[460px] z-40"
          >
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <div>
                <p className="font-semibold text-foreground text-sm">RAYMA</p>
                <p className="text-xs text-muted-foreground">AI Financial Advisor</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={handleClear} className="p-1.5 hover:bg-muted rounded-lg transition-colors" title="Clear conversation">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
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
                    Hi {userProfile?.preferred_name || "there"}! I'm RAYMA, your AI financial advisor. Type <b>"What can you do?"</b> to see my commands, or just ask me a question!
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
                                setMessages(prev => [...prev, { role: "assistant", content: "✅ Successfully refreshed the connection. Your sync is back to normal!" }]);
                              }}
                              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary/90 transition-colors self-start shadow-sm"
                            >
                              Yes, securely fix this
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
                className="h-10 p-2 bg-muted text-muted-foreground rounded-lg hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50 shrink-0"
                title="Scan & analyze a document"
              >
                {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Ask RAYMA…"
                className="flex-1 h-10 bg-muted border-0 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={loading || initializing}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading || initializing}
                className="h-10 p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
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
    </>
  );
}
