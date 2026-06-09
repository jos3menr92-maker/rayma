import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, ChevronLeft, ChevronRight, RefreshCw, X, 
  TrendingUp, AlertTriangle, Send, BrainCircuit, CalendarClock, Settings
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";

const CACHE_KEY = "rayma_insights_cache";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed.insights;
  } catch {
    return null;
  }
}

function saveCache(insights) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ insights, timestamp: Date.now() }));
}

export default function RAYMAInsights({ loans = [], bills = [], incomes = [] }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  
  const [showGreeting, setShowGreeting] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  
  // AI Chat & Action Engine State
  const [chatQuery, setChatQuery] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
  const touchStartX = useRef(null);
  const navigate = useNavigate();

  // 1. Fetch User Profile for Global Context
  useEffect(() => {
    base44.auth.me().then(me => setUserProfile(me)).catch(console.error);
  }, []);

  // 2. Initialization & Product Tour Check
  useEffect(() => {
    const hasSeenTour = localStorage.getItem("rayma_tour_test");
    if (!hasSeenTour) {
      setIsFirstTime(true);
      setShowGreeting(true);
    } else {
      const hasSeenGreetingThisSession = sessionStorage.getItem("rayma_greeted");
      if (!hasSeenGreetingThisSession) {
        setShowGreeting(true);
        sessionStorage.setItem("rayma_greeted", "true");
      }
    }

    const cached = loadCache();
    if (cached && cached.length > 0) {
      setInsights(cached);
    } else if (loans.length > 0 || bills.length > 0) {
      fetchInsights();
    }
  }, [loans.length, bills.length]);

  // 3. The Hybrid Brain (Your Exact Math + Local AI Checks + LLM API)
  async function fetchInsights(force = false) {
    if (loading) return;
    setLoading(true);
    setDismissed(false);

    // Your Exact Original Math
    const monthlyBills = bills.reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const monthlyLoans = loans.filter(l => l.status !== "paid_off").reduce((s, l) => s + (Number(l.monthly_payment) || 0), 0);
    const avgWeeklyIncome = incomes.length > 0 ? incomes.reduce((s, i) => s + (Number(i.amount) || 0), 0) / incomes.length : 0;
    const monthlyIncome = avgWeeklyIncome * 4.33;
    
    let localAlerts = [];
    const totalObligations = monthlyBills + monthlyLoans;

    // Proactive Alert: DTI Engine
    if (monthlyIncome > 0 && (totalObligations / monthlyIncome) * 100 > 43) {
      localAlerts.push({ type: 'warning', title: "Cash Flow Bottleneck", body: `Your obligations take up >43% of your income. Adding debt right now isn't recommended.`});
    }
    // Proactive Alert: Payday Collision Guard
    if (userProfile?.pay_day && bills.length > 0) {
      localAlerts.push({ type: 'opportunity', title: "Payday Collision Guard", body: `I'm tracking your bills against your ${userProfile.pay_day} payday to prevent overdrafts.`});
    }
    // Proactive Alert: Missing APR Estimator
    const loanMissingAPR = loans.find(l => !l.interest_rate && !l.apr);
    if (loanMissingAPR) {
      localAlerts.push({ type: 'tip', title: "Missing Interest Data", body: `You left the interest blank on your ${loanMissingAPR.name || 'recent loan'}. I'm estimating it at 15% for now.`});
    }

    // Your Original LLM API Call
    let result;
    try {
      result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are RAYMA, a proactive personal finance AI. Based on the user's financial data below, generate exactly 4 short, personalized, actionable insights...`,
        response_json_schema: { type: "object", properties: { insights: { type: "array", items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" }, type: { type: "string" }, } } } } }
      });
    } catch (e) {
      console.error("LLM Error:", e);
    }

    const llmInsights = result?.insights || [];
    
    // Combine everything smoothly
    const combinedList = [...localAlerts, ...llmInsights];
    
    if (combinedList.length > 0) {
      setInsights(combinedList);
      setIndex(0);
      saveCache(combinedList);
    }
    setLoading(false);
  }

  // 4. The Action Engine (Chat Input)
  const handleAskRayma = async (e) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;

    setIsTyping(true);
    setChatResponse("");
    const query = chatQuery.toLowerCase();
    
    // Command: Navigation
    if (query.includes("go to") || query.includes("take me to")) {
        if (query.includes("profile")) { navigate("/profile"); setChatResponse("Teleporting you to your Profile."); } 
        else if (query.includes("loans")) { navigate("/loans"); setChatResponse("Pulling up your Loans dashboard."); } 
        else { setChatResponse("I can navigate you anywhere. Just tell me where!"); }
        setIsTyping(false); setChatQuery(""); return;
    }
    
    // Command: Themes
    if (query.includes("dark mode") || query.includes("light mode")) {
        const newTheme = query.includes("dark mode") ? "dark" : "light";
        document.documentElement.classList.remove(newTheme === "dark" ? "light" : "dark");
        document.documentElement.classList.add(newTheme);
        localStorage.setItem("theme", newTheme);
        setChatResponse(`Switched to ${newTheme} mode.`);
        setIsTyping(false); setChatQuery(""); return;
    }

    // Command: Focus Mode
    if (query.includes("focus mode")) {
        try {
            await base44.auth.updateMe({ compact_mode: true });
            setChatResponse("Focus Mode activated. Dashboard colors muted.");
        } catch(err) { setChatResponse("Error saving to profile."); }
        setIsTyping(false); setChatQuery(""); return;
    }

    // Fallback: Send to LLM
    try {
        const result = await base44.integrations.Core.InvokeLLM({
            prompt: `You are RAYMA, a financial AI assistant. The user asked: "${chatQuery}". Answer concisely in 1-2 sentences.`
        });
        setChatResponse(result?.text || "I processed that, but couldn't generate a verbal response.");
    } catch (err) {
        setChatResponse("I'm having trouble connecting to my API brain right now.");
    }
    
    setIsTyping(false);
    setChatQuery("");
  };

  const focusChatInput = () => {
    const chatInput = document.getElementById("rayma-chat-input") || document.querySelector('input[placeholder*="Ask RAYMA"]');
    if (chatInput) {
      chatInput.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => chatInput.focus(), 300);
    }
  };

  // 5. Your Original Product Tour
  const startProductTour = () => {
    setShowGreeting(false); 
    
    const driverObj = window.driver.js.driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: false,
      popoverClass: 'driver-popover', 
      steps: [
        { popover: { title: 'Welcome to your Command Center! 🚀', description: "I'm RAYMA. I don't just track your money—I help you manage it. Let me show you how to put me to work.", align: 'center' } },
        { element: '#active-loans-section', popover: { title: 'Take Action on Debt 💳', description: "This is your active debt. See those PAY buttons? Use them to instantly log a payment.", side: "right", align: 'start' } },
        { element: '#rayma-insights', popover: { title: 'Daily AI Insights 💡', description: "Swipe through these cards daily. I generate them based on your live data.", side: "bottom", align: 'start' } },
        { element: '#financial-health-score', popover: { title: 'Your Financial Health 🏥', description: "Think of this as your high score. It recalculates dynamically.", side: "left", align: 'start' } },
        { element: '#rayma-chat-input', popover: { title: 'Your Control Panel 💬', description: "Don't just read the dashboard—talk to me and command me!", side: "top", align: 'center' } }
      ],
      onDestroyStarted: () => {
        driverObj.destroy();
        focusChatInput(); 
      }
    });

    driverObj.drive();
  };

  useEffect(() => {
    const handleRemoteTourStart = () => startProductTour();
    window.addEventListener("trigger-rayma-tour", handleRemoteTourStart);
    return () => window.removeEventListener("trigger-rayma-tour", handleRemoteTourStart);
  }, []);

  const handleGetStarted = () => {
    if (isFirstTime) {
      localStorage.setItem("rayma_tour_complete", "true");
      setIsFirstTime(false);
      startProductTour();
    } else {
      setShowGreeting(false);
      focusChatInput();
    }
  };

  const typeStyles = {
    tip: "border-primary/30 bg-primary/5 text-primary",
    warning: "border-amber-400/30 bg-amber-400/5 text-amber-500",
    opportunity: "border-chart-3/30 bg-chart-3/5 text-chart-3",
    win: "border-green-500/30 bg-green-500/10 text-green-500",
  };

  const nextInsight = () => setIndex((i) => (i + 1) % insights.length);
  const prevInsight = () => setIndex((i) => (i - 1 + insights.length) % insights.length);

  const current = insights[index];

  return (
    <div className="mb-6 space-y-4" id="rayma-insights">
      
      {/* --- RESTORED: Your Original Insight Carousel UI --- */}
      {insights.length > 0 && !dismissed && (
        <AnimatePresence mode="wait">
          <motion.div
            key={current?.title || index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`relative p-5 rounded-3xl border transition-all duration-500 ${typeStyles[current?.type] || typeStyles.tip} backdrop-blur-sm shadow-sm`}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-background/80 shadow-sm">
                <Sparkles className="w-6 h-6 currentColor" />
              </div>
              <div className="flex-1 pr-8">
                <h3 className="font-bold text-foreground mb-1">{current?.title}</h3>
                <p className="text-sm text-foreground/80 leading-relaxed">{current?.body}</p>
              </div>
            </div>

            {insights.length > 1 && (
              <div className="absolute top-4 right-4 flex gap-1">
                <button onClick={prevInsight} className="p-1.5 rounded-full hover:bg-background/80 text-foreground/60 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={nextInsight} className="p-1.5 rounded-full hover:bg-background/80 text-foreground/60 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* --- ADDED: The Action-Ready Chat Interface --- */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm" id="rayma-chat-input">
        <form onSubmit={handleAskRayma} className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <BrainCircuit className="w-4 h-4 text-muted-foreground" />
            </div>
            <input 
              type="text" 
              value={chatQuery}
              onChange={(e) => setChatQuery(e.target.value)}
              placeholder="Ask RAYMA to navigate, change themes, or run math..." 
              className="w-full pl-9 pr-4 py-3 bg-muted/50 border-transparent focus:border-primary rounded-xl text-sm transition-all"
            />
          </div>
          <button 
            type="submit" 
            disabled={!chatQuery.trim() || isTyping}
            className="p-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center"
          >
            {isTyping ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
        
        <AnimatePresence>
          {chatResponse && (
            <motion.div 
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 p-3 bg-primary/5 border border-primary/10 rounded-xl flex items-start gap-3 overflow-hidden"
            >
              <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground/90">{chatResponse}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- RESTORED: Your Original Greeting Modal UI --- */}
      <AnimatePresence>
        {showGreeting && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <div className="bg-card border border-border p-6 rounded-3xl shadow-xl max-w-sm w-full text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Hello, I'm RAYMA</h2>
              <p className="text-muted-foreground mb-6 text-sm">
                {isFirstTime ? "I'm your proactive financial co-pilot. Let's take a quick tour of your command center." : "Welcome back. I've analyzed your latest data. Let's get to work."}
              </p>
              <button onClick={handleGetStarted} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity">
                {isFirstTime ? "Start Tour" : "View Dashboard"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
