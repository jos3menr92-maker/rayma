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
  
  // Greeting and First-Time states
  const [showGreeting, setShowGreeting] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  
  const touchStartX = useRef(null);

  useEffect(() => {
    // 1. Handle Greeting Logic
    const hasSeenTour = localStorage.getItem("rayma_tour_complete");
    if (!hasSeenTour) {
      setIsFirstTime(true);
      setShowGreeting(true);
    } else {
      // Show greeting once per session for returning users
      const hasSeenGreetingThisSession = sessionStorage.getItem("rayma_greeted");
      if (!hasSeenGreetingThisSession) {
        setShowGreeting(true);
        sessionStorage.setItem("rayma_greeted", "true
