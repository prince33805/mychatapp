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
        <aside className="w-[30%] rounded-lg overflow-y-auto">
          <CustomerList
            onSelect={setActiveConversationId}
            activeConversationId={activeConversationId}
          />
        </aside>

        {/* ===== CHAT WINDOW ===== */}
        <div className="w-[70%] h-[600px] bg-white rounded-lg shadow flex flex-col">
          <Conversation conversationId={activeConversationId} />
        </div>
      </div>
    </div>
  );
}
