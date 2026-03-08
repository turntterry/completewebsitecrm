import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send, Plus, Phone, Search, CircleDot, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11 && d[0] === "1") return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

function timeAgo(date: string | Date) {
  const d = new Date(date);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days === 1) return "yesterday";
  return d.toLocaleDateString();
}

export default function Messages() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [search, setSearch] = useState("");
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const utils = trpc.useUtils();
  const { data: conversations = [], isLoading } = trpc.sms.conversations.useQuery(undefined, {
    refetchInterval: 15000, // poll every 15s for new messages
  });
  const { data: messages = [] } = trpc.sms.messages.useQuery(
    { conversationId: selectedId! },
    {
      enabled: !!selectedId,
      refetchInterval: 10000,
    }
  );

  const sendMutation = trpc.sms.send.useMutation({
    onSuccess: () => {
      utils.sms.messages.invalidate({ conversationId: selectedId! });
      utils.sms.conversations.invalidate();
      utils.sms.unreadCount.invalidate();
      setMessageText("");
    },
    onError: (e) => toast.error(e.message),
  });

  const startConvoMutation = trpc.sms.startConversation.useMutation({
    onSuccess: (convo) => {
      utils.sms.conversations.invalidate();
      setShowNewConvo(false);
      setNewPhone("");
      setNewName("");
      setSelectedId(convo?.id ?? null);
    },
    onError: (e) => toast.error(e.message),
  });

  const selectedConvo = conversations.find((c) => c.id === selectedId);

  const unreadCount = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations]
  );

  const filteredConvos = conversations.filter((c) => {
    const q = search.toLowerCase();
    const matchesQuery =
      !q ||
      c.customerName?.toLowerCase().includes(q) ||
      c.customerPhone.includes(q);
    const matchesUnread = !showUnreadOnly || (c.unreadCount ?? 0) > 0;
    return matchesQuery && matchesUnread;
  });

  function handleSend() {
    if (!messageText.trim() || !selectedConvo) return;
    sendMutation.mutate({
      toPhone: selectedConvo.customerPhone,
      body: messageText.trim(),
      customerName: selectedConvo.customerName ?? undefined,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Inbox</p>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Messages</h1>
            {unreadCount > 0 && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs px-2 py-1">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">SMS conversations synced every 10s</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={showUnreadOnly ? "default" : "outline"} size="sm" onClick={() => setShowUnreadOnly((p) => !p)}>
            <CircleDot className="h-3.5 w-3.5 mr-1" /> Unread
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="/admin/quotes/new" className="flex items-center gap-1"><FilePlus2 className="h-3.5 w-3.5" /> New Quote</a>
          </Button>
          <Button size="sm" onClick={() => setShowNewConvo(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Chat
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden rounded-2xl border mx-6 mb-6 bg-background shadow-sm">
        {/* Sidebar — conversation list */}
        <div className="w-80 shrink-0 border-r flex flex-col bg-background">
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Conversations</h2>
              <Button size="sm" variant="ghost" onClick={() => setShowNewConvo(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> New
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search name or phone"
                className="pl-8 h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredConvos.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowNewConvo(true)}>
                  Start one
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConvos.map((convo) => (
                  <button
                    key={convo.id}
                    className={cn(
                      "w-full text-left p-4 transition-colors text-sm",
                      selectedId === convo.id ? "bg-muted" : "hover:bg-muted/40"
                    )}
                    onClick={() => setSelectedId(convo.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {convo.customerName ?? formatPhone(convo.customerPhone)}
                          </span>
                          {convo.unreadCount > 0 && (
                            <Badge className="bg-blue-600 text-white text-xs px-1.5 py-0 min-w-[1.25rem] text-center shrink-0">
                              {convo.unreadCount}
                            </Badge>
                          )}
                        </div>
                        {convo.customerName && (
                          <p className="text-xs text-muted-foreground">{formatPhone(convo.customerPhone)}</p>
                        )}
                        {convo.lastMessageBody && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {convo.lastMessageBody}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {timeAgo(convo.lastMessageAt)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
      </div>

      {/* Thread panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-muted/10">
        {!selectedConvo ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <MessageSquare className="h-12 w-12 opacity-30" />
            <p className="text-sm">Select a conversation or start a new one</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="px-6 py-4 border-b bg-background flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    {selectedConvo.customerName ?? formatPhone(selectedConvo.customerPhone)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatPhone(selectedConvo.customerPhone)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" asChild>
                  <a href={`tel:${selectedConvo.customerPhone}`} className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href="/admin/quotes/new" className="flex items-center gap-1">
                    <FilePlus2 className="h-3.5 w-3.5" /> Quote
                  </a>
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3 flex flex-col">
                {messages.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    No messages yet. Send one below.
                  </p>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.direction === "outbound" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2 text-sm",
                        msg.direction === "outbound"
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-white border text-foreground rounded-bl-sm shadow-sm"
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                      <div
                        className={cn(
                          "text-xs mt-1 flex items-center gap-1",
                          msg.direction === "outbound" ? "text-blue-200 justify-end" : "text-muted-foreground"
                        )}
                      >
                        <span>{timeAgo(msg.sentAt)}</span>
                        {msg.direction === "outbound" && msg.status === "failed" && (
                          <span className="text-red-300 font-medium">· Failed</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Compose bar */}
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message... (Enter to send)"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMutation.isPending}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>

      {/* New Conversation Dialog */}
      <Dialog open={showNewConvo} onOpenChange={setShowNewConvo}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input
                placeholder="+1 (555) 000-0000"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Name <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                placeholder="Customer name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewConvo(false)}>Cancel</Button>
            <Button
              onClick={() =>
                startConvoMutation.mutate({
                  toPhone: newPhone.trim(),
                  customerName: newName.trim() || undefined,
                })
              }
              disabled={!newPhone.trim() || startConvoMutation.isPending}
            >
              Open Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
