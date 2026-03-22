import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2, X, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { toast } from "sonner";

interface DashInputProps {
  onSend: (text: string, fileUrls?: string[]) => void;
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

export function DashInput({ onSend, isLoading, onCancel, placeholder, className }: DashInputProps) {
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; url: string }[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { company } = useCompanyContext();

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user || !company) return;

    setUploading(true);
    const newFiles: { name: string; url: string }[] = [];

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
        .createSignedUrl(path, 3600);

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

  const MAX_LENGTH = 2000;

  const handleSubmit = () => {
    if ((!input.trim() && attachedFiles.length === 0) || isLoading || uploading) return;

    const trimmed = input.trim().substring(0, MAX_LENGTH);
    const fileContext = attachedFiles.length > 0
      ? `\n\n[Attached files: ${attachedFiles.map(f => f.name).join(", ")}]\n[File URLs: ${attachedFiles.map(f => f.url).join(", ")}]`
      : "";

    onSend(trimmed + fileContext, attachedFiles.map(f => f.url));
    setInput("");
    setAttachedFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

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
          disabled={isLoading || uploading}
          title="Attach file"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              const val = e.target.value;
              if (val.length <= MAX_LENGTH) setInput(val);
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={placeholder ?? "Ask Dash anything about your operations..."}
            rows={1}
            className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50 min-h-[42px] max-h-[120px]"
            style={{ height: "auto", overflow: "hidden" }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
          {input.length > MAX_LENGTH * 0.8 && (
            <span className={`absolute bottom-1 right-2 text-[10px] ${input.length >= MAX_LENGTH ? "text-destructive" : "text-muted-foreground"}`}>
              {input.length}/{MAX_LENGTH}
            </span>
          )}
        </div>

        {isLoading ? (
          <Button size="icon" variant="outline" onClick={onCancel} className="h-[42px] w-[42px] shrink-0 rounded-xl">
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="icon" onClick={handleSubmit} disabled={!input.trim() && attachedFiles.length === 0} className="h-[42px] w-[42px] shrink-0 rounded-xl">
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
