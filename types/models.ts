import {
  AdminRole,
  ConversationStatus,
  SenderType,
  MessageType,
} from './enums'

/* ===================== ADMIN ===================== */
export interface Admin {
  id: string
  email: string
  name: string
  role: AdminRole

  createdAt: string
  updatedAt: string
}

/* ===================== CUSTOMER ===================== */
export interface Customer {
  id: string
  lineUserId: string
  displayName?: string | null
  pictureUrl?: string | null

  createdAt: string
  updatedAt: string
}

/* ===================== CONVERSATION ===================== */
export interface Conversation {
  id: string
  status: ConversationStatus

  customerId: string
  assignedAdminId?: string | null

  lastMessageAt?: string | null
  createdAt: string
  updatedAt: string
}

/* ===================== MESSAGE ===================== */
export interface Message {
  id: string
  conversationId: string

  senderType: SenderType
  senderId?: string | null

  messageType: MessageType
  content?: string | null
  payload?: Record<string, any> | null

  createdAt: string
}

export type CreateMessage = Omit<Message, 'id' | 'createdAt'>
export type CreateConversation = Omit<
  Conversation,
  'id' | 'createdAt' | 'updatedAt' | 'lastMessageAt'
>
