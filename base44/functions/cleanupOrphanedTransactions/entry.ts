import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all transactions and bank accounts
    const [transactions, bankAccounts] = await Promise.all([
      base44.asServiceRole.entities.Transaction.list(),
      base44.asServiceRole.entities.BankAccount.list(),
    ]);

    // Get set of valid bank account IDs
    const validAccountIds = new Set(bankAccounts.map(acc => acc.id));

    // Find orphaned transactions (those referencing non-existent bank accounts)
    const orphanedTransactions = transactions.filter(
      t => t.bank_account_id && !validAccountIds.has(t.bank_account_id)
    );

    // Delete orphaned transactions
    let deletedCount = 0;
    for (const transaction of orphanedTransactions) {
      await base44.asServiceRole.entities.Transaction.delete(transaction.id);
      deletedCount++;
    }

    return Response.json({
      success: true,
      message: `Cleaned up ${deletedCount} orphaned transaction(s)`,
      deletedCount,
      orphanedTransactionIds: orphanedTransactions.map(t => t.id),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});