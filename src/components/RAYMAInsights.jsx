import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

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

export default function RAYMAInsights({ loans, bills, incomes }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  
  const [showGreeting, setShowGreeting] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  
  const touchStartX = useRef(null);

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

  async function fetchInsights(force = false) {
    if (loading) return;
    setLoading(true);
    setDismissed(false);

    const monthlyBills = bills.reduce((s, b) => s + (b.amount || 0), 0);
    const monthlyLoans = loans.filter(l => l.status !== "paid_off").reduce((s, l) => s + (l.monthly_payment || 0), 0);
    const avgWeeklyIncome = incomes.length > 0 ? incomes.reduce((s, i) => s + (i.amount || 0), 0) / incomes.length : 0;
    const monthlyIncome = avgWeeklyIncome * 4.33;
    const today = new Date().getDate();

    let result;
    try {
      result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are RAYMA, a proactive personal finance AI. Based on the user's financial data below, generate exactly 4 short, personalized, actionable insights...`,
        response_json_schema: { type: "object", properties: { insights: { type: "array", items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" }, type: { type: "string" }, } } } } }
      });
    } catch (e) {
      setLoading(false);
      setDismissed(true);
      return;
    }

    const list = result?.insights || [];
    setInsights(list);
    setIndex(0);
    saveCache(list);
    setLoading(false);
  }

  const focusChatInput = () => {
    const chatInput = document.getElementById("rayma-chat-input") || document.querySelector('input[placeholder*="Ask RAYMA"]');
    if (chatInput) {
      chatInput.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => chatInput.focus(), 300);
    }
  };

  const startProductTour = () => {
    setShowGreeting(false); 
    
    const driverObj = window.driver.js.driver({
      showProgress: true,
      animate: true,
      smoothScroll: true,
      allowClose: false,
      popoverClass: 'driver-popover', // This links the tour to your CSS!
      steps: [
        { popover: { title: 'Welcome to your Command Center! 🚀', description: "I'm RAYMA. I don't just track your money—I help you manage it. Let me show you how to put me to work.", align: 'center' } },
        { element: '#active-loans-section', popover: { title: 'Take Action on Debt 💳', description: "This is your active debt. See those PAY buttons? Use them to instantly log a payment.", side: "right", align: 'start' } },
        { element: '#rayma-insights', popover: { title: 'Daily AI Insights 💡', description: "Swipe through these cards daily. I generate them based on your live data.", side: "bottom", align: 'start' } },
        { element: '#financial-health-score', popover: { title: 'Your Financial Health 🏥', description: "Think of this as your high score. It recalculates dynamically.", side: "left", align: 'start' } },
        { element: '#rayma-chat-input', popover: { title: 'Your Control Panel 💬', description: "Don't just read the dashboard—talk to me!", side: "top", align: 'center' } }
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
    tip: "border-primary/30 bg-primary/5",
    warning: "border-amber-400/30 bg-amber-400/5",
    opportunity: "border-chart-3/30 bg-chart-3/5",
    win: "border-primary/40 bg-primary/10",
  };

  const current = insights[index];

  return (
    <div className="mb-6" id="rayma-insights">
      {/* (Keep the rest of your JSX exactly as it is!) */}
    </div>
  );
}
