import { useState, useEffect } from "react";
import { Clock, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

const KEY = "rayma_chat_history";
const MAX = 5;

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveHistory(messages) {
  try {
    const real = (messages || []).filter((m) => m && (m.content || "").trim());
    if (real.length === 0) return false;
    const firstUser = real.find((m) => m.role === "user");
    const title = ((firstUser?.content) || "Conversation").slice(0, 48);
    const entry = {
      id: Date.now().toString(),
      savedAt: new Date().toISOString(),
      title,
      messages: real,
    };
    const list = getHistory();
    list.unshift(entry);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    return true;
  } catch {
    return false;
  }
}

export function deleteHistory(id) {
  const list = getHistory().filter((h) => h.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

/**
 * Inline panel shown inside the chat when the history icon is tapped.
 * Trashing a conversation archives it here (cap 5); re-reading is always free.
 */
export default function ChatHistory({ onClose, onLoad }) {
  const { lang } = useLanguage();
  const T = (k, f) => {
    const r = t(lang, k);
    return r !== k ? r : f;
  };
  const [list, setList] = useState([]);

  useEffect(() => {
    setList(getHistory());
  }, []);

  const handleDelete = (id) => {
    deleteHistory(id);
    setList(getHistory());
  };

  if (list.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <Clock className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground max-w-[220px]">
          {T("noHistory", "No saved conversations yet. Trash a chat to save it here for free re-reading.")}
        </p>
        <button onClick={onClose} className="mt-3 text-xs text-primary underline">
          {T("backToChat", "Back to chat")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-muted-foreground">
          {T("historyTitle", "Saved Chats (last 5)")}
        </p>
        <button onClick={onClose} className="text-xs text-primary underline">
          {T("backToChat", "Back")}
        </button>
      </div>
      {list.map((h) => (
        <div key={h.id} className="border border-border rounded-lg p-2.5 hover:bg-muted/50 transition-colors">
          <div className="flex items-start justify-between gap-2">
            <button onClick={() => onLoad?.(h)} className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{h.title}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(h.savedAt).toLocaleString()}
              </p>
            </button>
            <button
              onClick={() => handleDelete(h.id)}
              className="p-1 hover:bg-muted rounded shrink-0"
              aria-label="Delete saved chat"
            >
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}