export type ConversationWithCustomerAndMessages = {
  id: string
  Customer: {
    lineUserId: string
    id: string
  }
  Message: {
    payload: any
    createdAt: string
  }[]
}

export type ConversationListItem = {
  conversationId: string
  customerId: string
  lineUserId: string
  displayName: string | null

  lastMessage: string
  lastSender: 'CUSTOMER' | 'ADMIN' | 'BOT'
  lastMessageAt: string | null
}

export type ConversationQueryRow = {
  id: string
  lastMessageAt: string | null

  Customer: {
    id: string
    lineUserId: string
    displayName: string | null
  }

  Message: {
    content: string | null
    sender_type: 'CUSTOMER' | 'ADMIN' | 'BOT'
    createdAt: string
  }[]
}
