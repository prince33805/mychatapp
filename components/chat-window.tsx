"use client";

import { useState } from "react";
import CustomerList from "./customer-list";
import Conversation from "./conversation";

export default function ChatWindow() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  return (
    // <div className="flex-1 w-full flex justify-center min-h-0">

    <div className="h-full w-full flex justify-center">
      {/* <div className="w-full max-w-6xl flex gap-4 p-4 min-h-0"> */}

      <div className="h-full w-full max-w-6xl flex gap-4 p-4 min-h-0">
        {/* ===== SIDEBAR ===== */}
        <aside className="w-72 rounded-lg overflow-y-auto border">
          <CustomerList
            onSelect={setActiveConversationId}
            activeConversationId={activeConversationId}
          />
        </aside>

        {/* ===== CHAT WINDOW ===== */}
        <section className="flex-1 border rounded-lg flex flex-col min-h-0">
          <Conversation conversationId={activeConversationId} />
        </section>
      </div>
    </div>
  );
}
