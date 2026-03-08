import React, { useState, useEffect } from "react";
import { Megaphone, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Broadcast {
  id: string;
  message: string;
  created_at: string;
}

export function AdminBroadcastPanel() {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<Broadcast[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("broadcasts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setHistory(data);
    };
    fetch();
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    const { data, error } = await supabase
      .from("broadcasts")
      .insert({ message: message.trim() })
      .select()
      .single();
    setIsSending(false);

    if (error) {
      toast.error("Грешка при изпращане на съобщението");
      return;
    }
    toast.success("Съобщението е изпратено до всички потребители");
    setMessage("");
    if (data) setHistory((prev) => [data, ...prev].slice(0, 10));
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("broadcasts").delete().eq("id", id);
    if (error) {
      toast.error("Грешка при изтриване");
      return;
    }
    setHistory((prev) => prev.filter((b) => b.id !== id));
    toast.success("Съобщението е изтрито");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Изпратете съобщение, което ще се покаже на всички потребители в приложението.
      </p>
      <Textarea
        placeholder="Напишете съобщение..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
      />
      <Button onClick={handleSend} disabled={isSending || !message.trim()} className="gap-2">
        <Send className="w-4 h-4" />
        {isSending ? "Изпращане..." : "Изпрати до всички"}
      </Button>

      {history.length > 0 && (
        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Последни съобщения</h4>
          {history.map((b) => (
            <div key={b.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-sm">
              <Megaphone className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="break-words">{b.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(b.created_at).toLocaleString("bg-BG")}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-destructive hover:text-destructive" onClick={() => handleDelete(b.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
