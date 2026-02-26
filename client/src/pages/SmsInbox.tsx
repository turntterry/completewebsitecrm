import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Send,
  Plus,
  Search,
  Phone,
  CheckCheck,
  AlertCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function initials(name?: string | null, phone?: string) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return phone?.slice(-2) ?? "??";
}

function timeAgo(dateStr: string | Date) {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function StatusIcon({ status }: { status: string }) {
  if (status === "sent" || status === "delivered")
    return <CheckCheck className="h-3 w-3 text-blue-400" />;
  if (status === "failed") return <AlertCircle className="h-3 w-3 text-red-400" />;
  return <Clock className="h-3 w-3 text-muted-foreground" />;
}

export default function SmsInbox() {
  const utils = trpc.useUtils();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], refetch: refetchConvos } = trpc.sms.conversations.useQuery(
    undefined,
    { refetchInterval: 15000 }
  );

  const { data: messages = [], refetch: refetchMessages } = trpc.sms.messages.useQuery(
    { conversationId: selectedId! },
    {
      enabled: !!selectedId,
      refetchInterval: 8000,
    }
  );

  const sendMutation = trpc.sms.send.useMutation({
    onSuccess: () => {
      setMessageText("");
      refetchMessages();
      refetchConvos();
    },
    onError: (e) => toast.error(e.message),
  });

  const startConvoMutation = trpc.sms.startConversation.useMutation({
    onSuccess: (convo) => {
      refetchConvos();
      if (convo) setSelectedId(convo.id);
      setShowNewDialog(false);
      setNewPhone("");
      setNewName("");
    },
    onError: (e) => toast.error(e.message),
  });

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [messages]);

  // Mark read when selecting
  function selectConversation(id: number) {
    setSelectedId(id);
    utils.sms.unreadCount.invalidate();
  }

  const selectedConvo = conversations.find((c: any) => c.id === selectedId);

  const filteredConvos = conversations.filter((c: any) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.customerName?.toLowerCase().includes(q) ||
      c.customerPhone?.includes(q)
    );
  });

  function handleSend() {
    if (!selectedConvo || !messageText.trim()) return;
    sendMutation.mutate({
      toPhone: (selectedConvo as any).customerPhone,
      body: messageText.trim(),
      customerId: (selectedConvo as any).customerId ?? undefined,
      customerName: (selectedConvo as any).customerName ?? undefined,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleStartConvo() {
    if (!newPhone.trim()) return toast.error("Phone number required");
    startConvoMutation.mutate({
      toPhone: newPhone.trim(),
      customerName: newName.trim() || undefined,
    });
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar - Conversation List */}
      <div className="w-80 shrink-0 border-r flex flex-col bg-background">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Messages
            </h2>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={() => setShowNewDialog(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConvos.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {search ? "No conversations found" : "No messages yet"}
            </div>
          ) : (
            filteredConvos.map((c: any) => (
              <button
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b hover:bg-muted/40 transition-colors flex items-start gap-3",
                  selectedId === c.id && "bg-muted/60"
                )}
              >
                <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {initials(c.customerName, c.customerPhone)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium truncate">
                      {c.customerName || formatPhone(c.customerPhone)}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {timeAgo(c.lastMessageAt)}
                    </span>
                  </div>
                  {c.customerName && (
                    <p className="text-xs text-muted-foreground">{formatPhone(c.customerPhone)}</p>
                  )}
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {c.lastMessageBody || "No messages yet"}
                  </p>
                </div>
                {c.unreadCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-xs h-5 px-1.5 shrink-0 mt-1">
                    {c.unreadCount}
                  </Badge>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col bg-background min-w-0">
        {!selectedConvo ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">Select a conversation</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              or start a new one to send an SMS
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowNewDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" /> New Message
            </Button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-5 py-3.5 border-b flex items-center gap-3 bg-background">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                  {initials((selectedConvo as any).customerName, (selectedConvo as any).customerPhone)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold leading-tight">
                  {(selectedConvo as any).customerName || formatPhone((selectedConvo as any).customerPhone)}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {formatPhone((selectedConvo as any).customerPhone)}
                </p>
              </div>
              {(selectedConvo as any).customerId && (
                <a
                  href={`/admin/clients/${(selectedConvo as any).customerId}`}
                  className="ml-auto text-xs text-primary hover:underline"
                >
                  View Client →
                </a>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No messages yet. Send the first one!
                </div>
              ) : (
                (messages as any[]).map((msg: any) => {
                  const isOutbound = msg.direction === "outbound";
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[70%]",
                        isOutbound ? "ml-auto items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                          isOutbound
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        )}
                      >
                        {msg.body}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 px-1">
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(msg.sentAt).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                        {isOutbound && <StatusIcon status={msg.status} />}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Message input */}
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2 items-end">
                <Textarea
                  className="min-h-[44px] max-h-32 resize-none text-sm"
                  placeholder="Type a message... (Enter to send)"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                />
                <Button
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Shift+Enter for new line · Enter to send
              </p>
            </div>
          </>
        )}
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Phone Number</label>
              <Input
                placeholder="+1 (555) 000-0000"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Name <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                placeholder="Customer name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStartConvo}
              disabled={startConvoMutation.isPending}
            >
              Start Conversation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
