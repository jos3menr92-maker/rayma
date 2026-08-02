import { useLanguage } from "@/lib/LanguageContext";
import { LANGUAGES } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Globe, Check } from "lucide-react";

export default function LanguageSwitcher({ compact = false }) {
  const { lang, setLang } = useLanguage();
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Change language"
          className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl border border-border/60 bg-transparent hover:bg-muted/40 transition-colors text-sm font-medium text-foreground"
        >
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span className="text-base leading-none">{current.flag}</span>
          {!compact && <span className="hidden sm:inline">{current.label.split(" ")[0]}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px] max-h-[320px] overflow-y-auto">
        {LANGUAGES.map(({ code, flag, label }) => (
          <DropdownMenuItem
            key={code}
            onSelect={() => setLang(code)}
            className="flex items-center gap-2 justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">{flag}</span>
              {label}
            </span>
            {code === lang && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}