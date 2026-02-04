'use client';

import { useEffect, useState } from 'react';
import { createClient } from "@/lib/supabase/browser";

type ConversationListItem = {
  conversationId: string;
  customerId: string;
  lineUserId: string;
  displayName: string | null;
  lastMessage: string;
  lastSender: 'CUSTOMER' | 'ADMIN' | 'BOT';
  lastMessageAt: string | null;
};

type CustomerListProps = {
  onSelect: (conversationId: string) => void;
  activeConversationId?: string | null;
};

export default function CustomerList({
  onSelect,
  activeConversationId,
}: CustomerListProps) {
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConversations() {
      try {
        const res = await fetch('/api/admin/conversations');
        const data = await res.json();
        setItems(data);
      } catch (err) {
        console.error('Failed to load conversations', err);
      } finally {
        setLoading(false);
      }
    }

    fetchConversations();
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("sidebar-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
        },
        (payload) => {
          const newMsg = payload.new as {
            id: string;
            conversationId: string;
            content: string | null;
            senderType: "CUSTOMER" | "ADMIN" | "BOT";
            createdAt: string;
            client_id?: string | null;
          };

          setItems((prev) => {
            const idx = prev.findIndex(
              (c) => c.conversationId === newMsg.conversationId
            );

            // ไม่รู้จัก conversation นี้ → ไม่ต้องทำอะไร
            if (idx === -1) return prev;

            const target = prev[idx];

            // กัน update ซ้ำ (กรณี admin optimistic + realtime)
            if (
              target.lastMessageAt &&
              new Date(newMsg.createdAt).getTime() <=
              new Date(target.lastMessageAt).getTime()
            ) {
              return prev;
            }

            const updated = {
              ...target,
              lastMessage: newMsg.content ?? "",
              lastSender: newMsg.senderType,
              lastMessageAt: newMsg.createdAt,
            };

            // เอา conversation นี้ขึ้นบนสุด
            const rest = prev.filter((_, i) => i !== idx);
            return [updated, ...rest];
          });
        }
      )
      .subscribe((status) => {
        console.log("sidebar realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-sm text-slate-500">Loading conversations...</div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      {items.map((c) => (
        <div key={c.conversationId} className="px-4 py-1">
          <div
            onClick={() => onSelect(c.conversationId)}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors
                ${activeConversationId === c.conversationId
                ? 'bg-primary/10 border-l-4 border-primary'
                : 'hover:bg-slate-200/50 dark:hover:bg-surface-dark/50'
              }
            `}
          >
            {/* Avatar */}
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-sm font-semibold text-white">
                {(c.displayName ?? c.lineUserId).charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {c.displayName ?? c.lineUserId}
                </p>
                {c.lastMessageAt && (
                  <span className="text-[10px] text-slate-400">
                    {new Date(c.lastMessageAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {c.lastSender === 'ADMIN' ? 'คุณ: ' : ''}
                {c.lastMessage}
              </p>
            </div>
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="p-4 text-sm text-slate-500">No conversations yet</div>
      )}
    </div>
  );
}
