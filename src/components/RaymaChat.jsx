import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Paperclip, Loader2, Trash2, Heart } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";

// Free 6-month trial from account creation; donation extends from today (or current expiry)
function getRaymaExpiry(user) {
  if (user?.rayma_expires_at) return new Date(user.rayma_expires_at + "T00:00:00");
  if (user?.created_date) {
    const trial = new Date(user.created_date);
    trial.setMonth(trial.getMonth() + 6);
    return trial;
  }
  return null;
}

function isRaymaActive(user) {
  const expiry = getRaymaExpiry(user);
  if (!expiry) return true; // can't determine, allow
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiry >= today;
}

export default function RaymaChat() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [raymaActive, setRaymaActive] = useState(null); // null = loading
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null); // { name, url }
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then((user) => {
      setRaymaActive(isRaymaActive(user));
    });
  }, []);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function openChat() {
    setOpen(true);
    if (!raymaActive) return; // show donation wall
    if (conversation) return;
    setLoading(true);
    const conv = await base44.agents.createConversation({
      agent_name: "rayma",
      metadata: { name: "RAYMA Chat" },
    });
    setConversation(conv);
    setMessages(conv.messages || []);

    const unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages(data.messages || []);
    });

    // Store unsubscribe for cleanup
    conv._unsubscribe = unsubscribe;
    setLoading(false);

    // Send greeting trigger
    setSending(true);
    await base44.agents.addMessage(conv, {
      role: "user",
      content: "Hi RAYMA! Please introduce yourself and give me a quick overview of my current financial situation based on my data.",
    });
    setSending(false);
  }

  function closeChat() {
    setOpen(false);
  }

  async function clearConversation() {
    if (!window.confirm("Clear this conversation and start fresh?")) return;
    setConversation(null);
    setMessages([]);
    setInput("");
    setAttachedFile(null);
    // Re-open a fresh conversation
    setLoading(true);
    const conv = await base44.agents.createConversation({
      agent_name: "rayma",
      metadata: { name: "RAYMA Chat" },
    });
    setConversation(conv);
    setMessages(conv.messages || []);
    const unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages(data.messages || []);
    });
    conv._unsubscribe = unsubscribe;
    setLoading(false);
    setSending(true);
    await base44.agents.addMessage(conv, {
      role: "user",
      content: "Hi RAYMA! Please introduce yourself and give me a quick overview of my current financial situation based on my data.",
    });
    setSending(false);
  }

  async function handleFileAttach(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAttachedFile({ name: file.name, url: file_url });
    setUploadingFile(false);
    e.target.value = "";
  }

  async function handleSend(e) {
    e.preventDefault();
    if ((!input.trim() && !attachedFile) || sending || !conversation) return;
    const text = input.trim() || (attachedFile ? "Please analyze this document for me." : "");
    const fileUrls = attachedFile ? [attachedFile.url] : undefined;
    setInput("");
    setAttachedFile(null);
    setSending(true);
    await base44.agents.addMessage(conversation, {
      role: "user",
      content: text,
      ...(fileUrls && { file_urls: fileUrls }),
    });
    setSending(false);
  }

  const visibleMessages = messages.filter(
    (m) => m.role !== "system" && !(m.role === "user" && m.content?.includes("Hi RAYMA! Please introduce yourself"))
  );

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={openChat}
        className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center"
        title="Chat with RAYMA"
      >
        <Sparkles className="w-5 h-5 text-primary-foreground" />
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={closeChat}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", damping: 24, stiffness: 300 }}
              className="fixed bottom-24 right-4 z-50 w-80 h-[480px] bg-card border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="bg-primary/10 border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-bold font-heading text-foreground leading-none">RAYMA</p>
                    <p className="text-[10px] text-muted-foreground">Your financial advisor</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={clearConversation} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors" title="Clear conversation">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={closeChat} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Donation wall when RAYMA inactive */}
              {raymaActive === false && (
                <div className="flex-1 flex flex-col items-center justify-center p-5 text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">RAYMA is not active</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      AI features require a donation to cover operating costs.
                      A donation of any amount keeps RAYMA running for 6 months.
                    </p>
                  </div>
                  <button
                    onClick={() => { setOpen(false); navigate("/support"); }}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <Heart className="w-3.5 h-3.5" />
                    Donate to unlock RAYMA
                  </button>
                  <p className="text-[10px] text-muted-foreground">All other features remain free forever.</p>
                </div>
              )}

              {/* Messages */}
              {raymaActive !== false && <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {loading && (
                  <div className="flex justify-center py-6">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                )}
                {visibleMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <p>{msg.content}</p>
                      ) : (
                        <ReactMarkdown
                          className="prose prose-xs max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-0.5 [&_ul]:my-1 [&_li]:my-0 [&_strong]:font-semibold"
                        >
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-secondary rounded-2xl px-3 py-2">
                      <div className="flex gap-1 items-center h-4">
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>}

              {/* Input */}
              {raymaActive !== false && <form onSubmit={handleSend} className="border-t border-border px-3 py-2.5 flex flex-col gap-2 shrink-0">
                {attachedFile && (
                  <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-3 py-1.5 text-xs text-primary">
                    <Paperclip className="w-3 h-3 shrink-0" />
                    <span className="truncate flex-1">{attachedFile.name}</span>
                    <button type="button" onClick={() => setAttachedFile(null)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingFile || sending || loading}
                    className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
                    title="Attach image or document"
                  >
                    {uploadingFile ? <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" /> : <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask RAYMA anything..."
                    className="flex-1 text-xs bg-muted rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                    disabled={sending || loading}
                  />
                  <button
                    type="submit"
                    disabled={(!input.trim() && !attachedFile) || sending || loading || uploadingFile}
                    className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center disabled:opacity-40 transition-opacity shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 text-primary-foreground" />
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileAttach} />
              </form>}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}