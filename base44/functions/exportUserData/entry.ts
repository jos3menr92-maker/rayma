/**
 * GDPR / CCPA Data Export
 * Returns all user data as a JSON bundle for download.
 * Required by GDPR Art. 20 (Right to Data Portability) and CCPA.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all user-owned data in parallel
    const [loans, bills, payments, transactions, budgetCategories, assets, savingsGoals, weeklyIncomes, netWorthSnapshots, scannedDocuments, userMemories] = await Promise.all([
      base44.entities.Loan.list(),
      base44.entities.Bill.list(),
      base44.entities.Payment.list(),
      base44.entities.Transaction.list(),
      base44.entities.BudgetCategory.list(),
      base44.entities.Asset.list(),
      base44.entities.SavingsGoal.list(),
      base44.entities.WeeklyIncome.list(),
      base44.entities.NetWorthSnapshot.list(),
      base44.entities.ScannedDocument.list(),
      base44.entities.UserMemory.list(),
    ]);

    const exportBundle = {
      export_date: new Date().toISOString(),
      export_version: "1.0",
      app: "Rayma AI — Debt & Bills Tracker",
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        created_date: user.created_date,
      },
      data: {
        loans,
        bills,
        payments,
        transactions,
        budget_categories: budgetCategories,
        assets,
        savings_goals: savingsGoals,
        weekly_incomes: weeklyIncomes,
        net_worth_snapshots: netWorthSnapshots,
        scanned_documents: scannedDocuments.map(d => ({
          ...d,
          file_url: d.file_url, // URL included; actual file requires separate download
        })),
        ai_memories: userMemories,
      },
      notes: "This export contains all personal financial data stored by Rayma AI for your account. To request permanent deletion, visit the Delete Account section in your profile.",
    };

    return new Response(JSON.stringify(exportBundle, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="rayma-data-export-${user.id}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('[exportUserData] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});