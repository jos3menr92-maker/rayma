import { useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Upload, Camera, FileImage, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createRecord } from "@/lib/supabaseHelpers";
import { useFinancialData } from "@/lib/FinancialDataContext";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast";
import { compressImage } from "@/utils/compressImage";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit before compression

export default function DocumentUploader({ onDocumentScanned }) {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const { supaUser } = useFinancialData();
  const { toast } = useToast();

  async function processFile(rawFile) {
    if (!rawFile) return;

    // Validate file size
    if (rawFile.size > MAX_FILE_SIZE) {
      toast({ title: T("uploadFailed", "Upload failed"), description: T("fileTooLarge", "File too large (max 10MB). Try a smaller photo."), variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      // Compress images to prevent upload/analysis timeouts ("Failed to fetch")
      setUploadStep(T("preparing", "Preparing…"));
      const file = await compressImage(rawFile);

      // Upload to private storage — sensitive tax/financial docs must not be publicly accessible
      setUploadStep(T("uploading", "Uploading…"));
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      // Generate a short-lived signed URL for AI analysis (expires in 10 min)
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 600 });

    const today = new Date().toISOString().split("T")[0];

      // --- AI Analysis (resilient: if this times out, still save the document ---
      // so the user's upload is never lost. They can review it manually later.)
      let analysis;
      try {
        setUploadStep(T("analyzing", "Analyzing…"));
        analysis = await base44.integrations.Core.InvokeLLM({
          prompt: `You are Rayma AI, a financial document analyzer. Analyze this financial document image and extract all relevant information.

Determine:
1. What type of document this is (receipt, invoice, tax form W-2/1099, loan statement, bill/utility, bank statement, pay stub, insurance, other)
2. Whether it contains data that can be logged into a financial tracker (payments, bills, loans, income)
3. Which folder it belongs to: "payments" (one-time payment receipts), "loans" (loan statements), "bills" (recurring bills/utilities), "tax" (tax forms, W-2, 1099), "misc" (anything else)
4. Extract all financial data found

Today's date: ${today}`,
          file_urls: [signed_url],
          model: "gemini_3_flash",
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
      } catch (analysisErr) {
        console.warn('[DocumentUploader] AI analysis failed, saving document for manual review:', analysisErr?.message);
        analysis = {
          document_type: "unknown",
          folder: "misc",
          loggable: false,
          rayma_message: "Analysis timed out — saved for manual review.",
          extracted_data: {},
        };
      }

      // --- Save the document (always runs, even if analysis timed out) ---
      setUploadStep(T("saving", "Saving…"));
      const doc = await createRecord('documents', {
        file_url: file_uri,
        file_name: file.name,
        folder: analysis.folder || "misc",
        status: "pending_review",
        document_type: analysis.document_type,
        extracted_data: analysis.extracted_data || {},
        loggable: analysis.loggable !== false,
        notes: analysis.rayma_message || analysis.summary,
        scan_date: today,
      });
      onDocumentScanned({ ...doc, _analysis: analysis });
    } catch (err) {
      console.error('Document upload failed:', err);
      const isFetchErr = err?.message?.includes("Failed to fetch") || err?.name === "TypeError";
      const desc = isFetchErr
        ? T("uploadTimeout", "Network timeout — the file may be too large or the connection is slow. Try a smaller photo.")
        : (err?.message || T("tryAgain", "Please try again"));
      toast({ title: T("uploadFailed", "Upload failed"), description: desc, variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadStep("");
    }
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
            <p className="text-sm font-medium text-foreground">{uploadStep || T("raymaAnalyzing", "Rayma AI is analyzing your document…")}</p>
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