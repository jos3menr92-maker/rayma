import { useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Upload, Camera, FileImage, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

export default function DocumentUploader({ onDocumentScanned }) {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function processFile(file) {
    if (!file) return;
    setUploading(true);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const today = new Date().toISOString().split("T")[0];
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `You are Rayma AI, a financial document analyzer. Analyze this financial document image and extract all relevant information.

Determine:
1. What type of document this is (receipt, invoice, tax form W-2/1099, loan statement, bill/utility, bank statement, pay stub, insurance, other)
2. Whether it contains data that can be logged into a financial tracker (payments, bills, loans, income)
3. Which folder it belongs to: "payments" (one-time payment receipts), "loans" (loan statements), "bills" (recurring bills/utilities), "tax" (tax forms, W-2, 1099), "misc" (anything else)
4. Extract all financial data found

Today's date: ${today}`,
      file_urls: [file_url],
      model: "claude_sonnet_4_6",
      response_json_schema: {
        type: "object",
        properties: {
          document_type: { type: "string" },
          folder: { type: "string", enum: ["payments", "loans", "bills", "tax", "misc"] },
          loggable: { type: "boolean" },
          summary: { type: "string" },
          rayma_message: { type: "string" },
          extracted_data: {
            type: "object",
            properties: {
              amount: { type: "number" },
              date: { type: "string" },
              payee: { type: "string" },
              description: { type: "string" },
              account_number: { type: "string" },
              due_date: { type: "string" },
              interest_rate: { type: "number" },
              balance: { type: "number" },
              tax_year: { type: "string" },
              employer: { type: "string" },
              income_amount: { type: "number" },
              category: { type: "string" }
            }
          }
        }
      }
    });

    const doc = await base44.entities.ScannedDocument.create({
      file_url,
      file_name: file.name,
      folder: analysis.folder || "misc",
      status: "pending_review",
      document_type: analysis.document_type,
      extracted_data: analysis.extracted_data || {},
      loggable: analysis.loggable !== false,
      notes: analysis.rayma_message || analysis.summary,
      scan_date: today,
    });

    setUploading(false);
    onDocumentScanned({ ...doc, _analysis: analysis });
  }

  function handleFiles(files) {
    if (files[0]) processFile(files[0]);
  }

  return (
    <div>
      <motion.div
        whileTap={{ scale: 0.98 }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => !uploading && fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/30"
        } ${uploading ? "pointer-events-none" : ""}`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">{T("raymaAnalyzing", "Rayma AI is analyzing your document…")}</p>
            <p className="text-xs text-muted-foreground">{T("extractingData", "Extracting financial data")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{T("uploadOrPhoto", "Upload or take a photo")}</p>
              <p className="text-xs text-muted-foreground mt-1">{T("uploadDesc", "Receipts, bills, loan statements, tax forms")}</p>
            </div>
            <div className="flex gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                <FileImage className="w-3 h-3" /> {T("uploadFormats", "JPG, PNG, PDF")}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                <Camera className="w-3 h-3" /> {T("camera", "Camera")}
              </span>
            </div>
          </div>
        )}
      </motion.div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}