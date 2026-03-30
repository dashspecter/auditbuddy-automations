import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2, X, Paperclip, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useDashLocale } from "@/contexts/DashLocaleContext";

export interface DashAttachment {
  name: string;
  url: string;
}

interface DashInputProps {
  onSend: (text: string, attachments?: DashAttachment[]) => void;
  isLoading: boolean;
  onCancel?: () => void;
  placeholder?: string;
  className?: string;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg", "image/png", "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LENGTH = 2000;

export function DashInput({ onSend, isLoading, onCancel, placeholder, className }: DashInputProps) {
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<DashAttachment[]>([]);
  const [interimText, setInterimText] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { company } = useCompanyContext();
  const { t, speechLocale } = useDashLocale();

  // Track the input value before voice started so we can append to it
  const preVoiceInputRef = useRef("");

  const handleVoiceResult = useCallback((transcript: string) => {
    const base = preVoiceInputRef.current;
    const separator = base && !base.endsWith(" ") ? " " : "";
    const combined = (base + separator + transcript).substring(0, MAX_LENGTH);
    setInput(combined);
    setInterimText(null);
  }, []);

  const handleVoiceInterim = useCallback((interimTranscript: string) => {
    const base = preVoiceInputRef.current;
    const separator = base && !base.endsWith(" ") ? " " : "";
    setInterimText((base + separator + interimTranscript).substring(0, MAX_LENGTH));
  }, []);

  const { isSupported: voiceSupported, isListening, error: voiceError, toggle: toggleVoice } = useSpeechRecognition({
    locale: speechLocale,
    onResult: handleVoiceResult,
    onInterim: handleVoiceInterim,
  });

  // Show voice errors as toasts
  useEffect(() => {
    if (voiceError) {
      toast.error(voiceError);
    }
  }, [voiceError]);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user || !company) return;

    setUploading(true);
    const newFiles: DashAttachment[] = [];

    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`Unsupported file type: ${file.name}. Supported: PDF, images, spreadsheets.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File too large: ${file.name}. Max 10MB.`);
        continue;
      }

      const path = `${company.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("dash-uploads")
        .upload(path, file, { contentType: file.type });

      if (error) {
        toast.error(`Upload failed: ${file.name}`);
        console.error("Dash upload error:", error);
        continue;
      }

      const { data: urlData } = await supabase.storage
        .from("dash-uploads")
        .createSignedUrl(path, 86400); // 24-hour expiry so files remain accessible for long sessions

      if (urlData?.signedUrl) {
        newFiles.push({ name: file.name, url: urlData.signedUrl });
      }
    }

    setAttachedFiles(prev => [...prev, ...newFiles]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if ((!input.trim() && attachedFiles.length === 0) || isLoading || uploading) return;

    const trimmed = input.trim().substring(0, MAX_LENGTH);
    // Pass attachments as structured data, NOT embedded in the text
    onSend(trimmed, attachedFiles.length > 0 ? attachedFiles : undefined);
    setInput("");
    setAttachedFiles([]);
    setInterimText(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleToggleVoice = () => {
    if (!isListening) {
      // Capture current input so voice transcript appends to it
      preVoiceInputRef.current = input;
    }
    toggleVoice();
  };

  // Display text: show interim (live) while listening, otherwise the committed input
  const displayValue = isListening && interimText !== null ? interimText : input;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {attachedFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/80 border border-border/60 text-xs">
              <Paperclip className="h-3 w-3 text-muted-foreground" />
              <span className="truncate max-w-[120px]">{f.name}</span>
              <button onClick={() => removeFile(i)} className="ml-0.5 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Listening indicator */}
      {isListening && (
        <div className="flex items-center gap-2 px-2 text-xs text-red-500 animate-pulse">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          {t.listening} ({speechLocale === "ro-RO" ? "Română" : "English"})
        </div>
      )}

      <div className="flex gap-2 items-end">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Attach button */}
        <Button
          size="icon"
          variant="ghost"
          className="h-[42px] w-[42px] shrink-0 rounded-xl"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || uploading || isListening}
          title={t.attachFile}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </Button>

        {/* Voice input button — only rendered if browser supports it */}
        {voiceSupported && (
          <Button
            size="icon"
            variant={isListening ? "destructive" : "ghost"}
            className={cn(
              "h-[42px] w-[42px] shrink-0 rounded-xl transition-colors",
              isListening && "animate-pulse"
            )}
            onClick={handleToggleVoice}
            disabled={isLoading || uploading}
            title={isListening ? t.stopRecording : t.voiceInput}
          >
            {isListening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        )}

        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={displayValue}
            onChange={e => {
              const val = e.target.value;
              if (val.length <= MAX_LENGTH) setInput(val);
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            readOnly={isListening}
            placeholder={placeholder ?? t.placeholder}
            rows={1}
            className={cn(
              "w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50 min-h-[42px] max-h-[120px]",
              isListening && "border-red-300 bg-red-50/30 dark:bg-red-950/10"
            )}
            style={{ height: "auto", overflow: "hidden" }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
          {displayValue.length > MAX_LENGTH * 0.8 && (
            <span className={`absolute bottom-1 right-2 text-[10px] ${displayValue.length >= MAX_LENGTH ? "text-destructive" : "text-muted-foreground"}`}>
              {displayValue.length}/{MAX_LENGTH}
            </span>
          )}
        </div>

        {isLoading ? (
          <Button size="icon" variant="outline" onClick={onCancel} className="h-[42px] w-[42px] shrink-0 rounded-xl">
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="icon" onClick={handleSubmit} disabled={(!input.trim() && attachedFiles.length === 0) || isListening} className="h-[42px] w-[42px] shrink-0 rounded-xl">
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
