"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

/* ===================== TYPES ===================== */
type Message = {
  id: string;
  clientId?: string | null;
  senderType: "CUSTOMER" | "ADMIN" | "BOT";
  content: string | null;
  createdAt: string;
};

type ConversationProps = {
  conversationId: string | null;
};

/* ===================== CONSTANT ===================== */
const INITIAL_LIMIT = 30;
const LOAD_MORE_LIMIT = 20;
const BOTTOM_THRESHOLD = 50;

/* ===================== COMPONENT ===================== */
export default function Conversation({ conversationId }: ConversationProps) {
  /* ===================== STATE ===================== */
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  /* ===================== FETCH INITIAL ===================== */
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setHasMore(true);
      return;
    }

    async function fetchInitial() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/conversations/${conversationId}/message?limit=${INITIAL_LIMIT}`
        );
        const data = await res.json();

        setMessages(data.messages);
        setHasMore(data.hasMore);
      } catch (err) {
        console.error("fetch initial messages failed", err);
      } finally {
        setLoading(false);
      }
    }

    fetchInitial();
  }, [conversationId]);

  /* ===================== REALTIME ===================== */
  useEffect(() => {
    if (!conversationId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;

          setMessages((prev) => {
            // 1️⃣ replace optimistic by clientId
            if (newMsg.clientId) {
              const idx = prev.findIndex(
                (m) => m.clientId === newMsg.clientId
              );
              if (idx !== -1) {
                const copy = [...prev];
                copy[idx] = newMsg;
                return copy;
              }
            }

            // 2️⃣ prevent duplicate by id
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  /* ===================== AUTO SCROLL ===================== */
  useEffect(() => {
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  /* ===================== SCROLL HANDLER ===================== */
  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;

    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <
      BOTTOM_THRESHOLD;

    setIsAtBottom(atBottom);

    if (el.scrollTop < 20) {
      loadMore();
    }
  }

  /* ===================== LOAD MORE ===================== */
  async function loadMore() {
    if (
      !conversationId ||
      !hasMore ||
      loadingMore ||
      messages.length === 0
    )
      return;

    setLoadingMore(true);

    try {
      const oldest = messages[0];

      const res = await fetch(
        `/api/admin/conversations/${conversationId}/message?limit=${LOAD_MORE_LIMIT}&before=${encodeURIComponent(
          oldest.createdAt
        )}`
      );

      const data = await res.json();

      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("load more failed", err);
    } finally {
      setLoadingMore(false);
    }
  }

  /* ===================== SEND MESSAGE ===================== */
  async function sendMessage() {
    if (!conversationId || !input.trim() || sending) return;

    const clientId = crypto.randomUUID();
    const text = input.trim();

    setInput("");
    setSending(true);

    const optimistic: Message = {
      id: clientId,
      clientId,
      senderType: "ADMIN",
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch("/api/admin/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          text,
          clientId,
        }),
      });

      if (!res.ok) throw new Error("send failed");
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimistic.id)
      );
      alert("ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  /* ===================== EMPTY STATE ===================== */
  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        Select a conversation
      </div>
    );
  }

  /* ===================== RENDER ===================== */
  return (
    <main className="flex-1 flex flex-col bg-white dark:bg-background-dark">
      {/* HEADER */}
      <header className="h-14 px-6 flex items-center border-b border-slate-200 dark:border-border-dark">
        <h2 className="text-sm font-bold">Conversation</h2>
      </header>

      {/* MESSAGES */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 flex flex-col gap-6"
      >
        {loading && (
          <div className="text-xs text-slate-400">Loading…</div>
        )}

        {messages.map((msg) => {
          const isCustomer = msg.senderType === "CUSTOMER";

          return isCustomer ? (
            <div
              key={msg.id}
              className="flex items-end gap-3 max-w-[80%]"
            >
              <div className="w-8 h-8 rounded-full bg-slate-400 shrink-0" />
              <div>
                <div className="bg-slate-100 p-4 rounded-2xl rounded-bl-none">
                  <p className="text-sm">{msg.content}</p>
                </div>
                <span className="text-[10px] text-slate-400 ml-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ) : (
            <div
              key={msg.id}
              className="flex flex-row-reverse items-end gap-3 max-w-[80%] self-end"
            >
              <div className="w-8 h-8 rounded-full bg-primary shrink-0" />
              <div className="flex flex-col items-end">
                <div className="bg-primary text-white p-4 rounded-2xl rounded-br-none">
                  <p className="text-sm">{msg.content}</p>
                </div>
                <span className="text-[10px] text-slate-400 mr-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })}

        {loadingMore && (
          <div className="text-xs text-slate-400 text-center">
            Loading more…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="p-4 border-t border-slate-200 dark:border-border-dark">
        <div className="flex items-center gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 resize-none rounded-lg border p-3 text-sm"
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-50"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </main>
  );
}
