import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import LoanCard from "../components/LoanCard";
import { Search, Filter, Plus, ArrowUpDown } from "lucide-react";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LoansList() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("default");

  useEffect(() => {
    loadLoans();
  }, []);

  async function loadLoans() {
    // Paginate: fetch 50 at a time
    const data = await base44.entities.Loan.list("-created_date", 50);
    setLoans(data);
    setLoading(false);
  }

  const filtered = useMemo(() => loans
    .filter((l) => {
      const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && l.status !== "paid_off") ||
        (filter === "paid_off" && l.status === "paid_off");
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sort === "amount_high") return (b.current_balance || 0) - (a.current_balance || 0);
      if (sort === "amount_low") return (a.current_balance || 0) - (b.current_balance || 0);
      if (sort === "interest") return (b.interest_rate || 0) - (a.interest_rate || 0);
      if (sort === "due_date") return (a.due_day || 99) - (b.due_day || 99);
      return 0;
    }), [loans, search, filter, sort]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold font-heading text-primary">
          My Loans
        </h1>
        <button
          onClick={() => navigate("/add-loan")}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Add Loan
        </button>
      </motion.div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search loans..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      {/* Filters + Sort */}
      <div className="flex items-center justify-between gap-2 mb-5">
        <div className="flex gap-2">
          {["all", "active", "paid_off"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f === "active" ? "Active" : "Paid Off"}
            </button>
          ))}
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-auto h-8 text-xs rounded-xl border-border bg-card gap-1 pr-3 pl-2">
            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="amount_high">Amount ↓</SelectItem>
            <SelectItem value="amount_low">Amount ↑</SelectItem>
            <SelectItem value="interest">Interest Rate</SelectItem>
            <SelectItem value="due_date">Due Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map((loan, i) => (
          <LoanCard key={loan.id} loan={loan} index={i} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-14">
          {loans.length === 0 ? (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-3xl">💳</div>
              <p className="text-base font-semibold text-foreground mb-1">No loans yet</p>
              <p className="text-sm text-muted-foreground mb-5">Add your first loan to start tracking your debt</p>
              <button
                onClick={() => navigate("/add-loan")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Your First Loan
              </button>
            </>
          ) : (
            <>
              <Filter className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No loans match your filters</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}