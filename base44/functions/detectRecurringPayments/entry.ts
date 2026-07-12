import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Supabase credentials not configured' }, { status: 500 });
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve the Supabase UUID from the Base44 user's email (scalable server-side search)
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ search: user.email });
    if (listError) throw listError;

    const supabaseUser = users.find(u => u.email === user.email);
    if (!supabaseUser) {
      return Response.json({
        success: true,
        recurring_payments: [],
        message: 'No Supabase account found for this user email'
      });
    }

    const supaUserId = supabaseUser.id;

    // Fetch all transactions for this user from Supabase using the correct UUID
    const { data: transactions, error } = await supabaseAdmin.from('transactions').select('*').eq('user_id', supaUserId);
    if (error) throw error;
    
    if (!transactions || transactions.length === 0) {
      return Response.json({ 
        success: true, 
        recurring_payments: [],
        message: 'No transactions found to analyze'
      });
    }

    // Group transactions by merchant (description) and amount
    const merchantMap = {};
    const last90Days = new Date();
    last90Days.setDate(last90Days.getDate() - 90);

    for (const txn of transactions) {
      const txnDate = new Date(txn.date);
      if (txnDate < last90Days) continue; // Skip older than 90 days

      const merchant = txn.description || 'Unknown';
      const amount = Math.abs(txn.amount);

      if (!merchantMap[merchant]) {
        merchantMap[merchant] = [];
      }
      merchantMap[merchant].push({ date: txnDate, amount });
    }

    // Detect recurring patterns
    const recurring = [];
    for (const [merchant, payments] of Object.entries(merchantMap)) {
      if (payments.length < 2) continue; // Need at least 2 transactions

      // Sort by date
      payments.sort((a, b) => a.date - b.date);

      // Check if amounts are consistent (allow 10% variance)
      const avgAmount = payments.reduce((sum, p) => sum + p.amount, 0) / payments.length;
      const consistentAmounts = payments.every(p => 
        Math.abs(p.amount - avgAmount) / avgAmount <= 0.1
      );

      if (!consistentAmounts) continue;

      // Detect frequency
      const intervals = [];
      for (let i = 1; i < payments.length; i++) {
        const daysDiff = Math.floor((payments[i].date - payments[i-1].date) / (1000 * 60 * 60 * 24));
        intervals.push(daysDiff);
      }

      const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
      let frequency = 'monthly';
      let dueDay = payments[payments.length - 1].date.getDate();

      if (avgInterval <= 7) {
        frequency = 'weekly';
        dueDay = null;
      } else if (avgInterval <= 15) {
        frequency = 'biweekly';
        dueDay = null;
      }

      // Only flag as recurring if we have enough confidence (3+ transactions or consistent pattern)
      if (payments.length >= 3 || (payments.length >= 2 && intervals.every(i => Math.abs(i - avgInterval) <= 3))) {
        recurring.push({
          merchant,
          amount: Math.round(avgAmount * 100) / 100,
          frequency,
          count: payments.length,
          dueDay: frequency === 'monthly' ? dueDay : null,
          lastDate: payments[payments.length - 1].date,
        });
      }
    }

    return Response.json({
      success: true,
      recurring_payments: recurring,
      count: recurring.length,
    });
  } catch (error) {
    console.error('Recurring payment detection error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});