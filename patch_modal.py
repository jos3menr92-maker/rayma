import re

with open('src/components/documents/DocumentReviewModal.jsx', 'r') as f:
    content = f.read()

# Update the isLoggable logic (currently it's inline in the button)
# We will change:
# {folder === "payments" || folder === "bills" ? T("approveAndLog", "Approve & Log") : T("approveAndSave", "Approve & Save")}
# to
# {folder === "payments" || folder === "bills" || doc.document_type === "paystub" || doc.document_type === "receipt" ? T("approveAndLog", "Approve & Log") : T("approveAndSave", "Approve & Save")}

content = content.replace(
    '{folder === "payments" || folder === "bills" ? T("approveAndLog", "Approve & Log") : T("approveAndSave", "Approve & Save")}',
    '{folder === "payments" || folder === "bills" || doc.document_type === "paystub" || doc.document_type === "receipt" ? T("approveAndLog", "Approve & Log") : T("approveAndSave", "Approve & Save")}'
)

# And in handleApprove
# if (folder === "payments" && fields.amount != null && fields.date) {
# will be updated to handle paystub too.
# Let's do it using a regex substitution that handles the whole block.
old_block = """      if (folder === "payments" && fields.amount != null && fields.date) {
        // A scanned receipt is an expense — log it as a Transaction so it shows
        // up in Recent Transactions and Merchant Insights (which both read the
        // transactions table). Previously this matched a loan and logged a loan
        // payment, so non-loan receipts were never logged anywhere.
        const amount = parseFloat(fields.amount);
        if (!isNaN(amount)) {
          // Use today's date for the transaction (when the document was logged),
          // not the printed receipt date, to keep the ledger current.
          const today = new Date().toISOString().split("T")[0];
          const tx = await createRecord("transactions", {
            date: today,
            description: fields.description || fields.payee || T("scannedReceipt", "Scanned receipt"),
            amount: -Math.abs(amount),
            category: normalizeTxCategory(fields.category),
            type: "debit",
            notes: `Auto-logged from document: ${doc.file_name}`,
          });
          await updateRecord("documents", doc.id, {
            status: "logged", folder, extracted_data: fields,
            logged_entity_type: "transaction", logged_entity_id: tx?.id
          });
        } else {
          await updateRecord("documents", doc.id, { status: "approved", folder, extracted_data: fields });
        }
      } else if (folder === "bills" && fields.amount != null) {"""

new_block = """      if (doc.document_type === "paystub" && fields.amount != null) {
        const income = await createRecord("incomes", {
          amount: parseFloat(fields.amount) || 0,
          date: fields.date || new Date().toISOString().split("T")[0],
          note: fields.description || `Imported paystub: ${doc.file_name || ""}`,
          source: fields.payee || fields.employer || "Paystub",
          is_recurring: false
        });
        await updateRecord("documents", doc.id, {
          status: "logged", folder, extracted_data: fields,
          logged_entity_type: "income", logged_entity_id: income?.id
        });
      } else if ((folder === "payments" || doc.document_type === "receipt") && fields.amount != null && fields.date) {
        const amount = parseFloat(fields.amount);
        if (!isNaN(amount)) {
          const today = new Date().toISOString().split("T")[0];
          const tx = await createRecord("transactions", {
            date: today,
            description: fields.description || fields.payee || T("scannedReceipt", "Scanned receipt"),
            amount: -Math.abs(amount),
            category: normalizeTxCategory(fields.category),
            type: "debit",
            notes: `Auto-logged from document: ${doc.file_name}`,
          });
          await updateRecord("documents", doc.id, {
            status: "logged", folder, extracted_data: fields,
            logged_entity_type: "transaction", logged_entity_id: tx?.id
          });
        } else {
          await updateRecord("documents", doc.id, { status: "approved", folder, extracted_data: fields });
        }
      } else if (folder === "bills" && fields.amount != null) {"""

content = content.replace(old_block, new_block)

with open('src/components/documents/DocumentReviewModal.jsx', 'w') as f:
    f.write(content)
