import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function RAYMAExpiryBanner({ message, type = "warning" }) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const styles = {
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    danger: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  return (
    <div className={`flex items-center justify-between p-4 border rounded-xl mb-6 ${styles[type] || styles.warning}`}>
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 opacity-80" />
        <p className="text-sm font-medium">{message || "Your trial is expiring soon."}</p>
      </div>
      <button 
        onClick={() => setIsVisible(false)}
        className="p-1 hover:bg-black/5 rounded-full transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}