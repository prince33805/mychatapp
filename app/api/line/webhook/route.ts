import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/client'
import {
  SenderType,
  MessageType,
  ConversationStatus,
} from '@/types/enums'
import type { CreateMessage, CreateConversation } from '@/types/models'

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!
// const newCustomers = [{
//   conId:'5e278706-0b86-428d-8f30-666ac3aef231',
//   id:'3981ab25-a62a-408e-9581-3f4d527206d7',
//   lineUserId: 'U1234567890abcdef1234567890abcdef',
//   displayName: 'John Doe',
// }, {
//   conId:'23aea429-4ea0-4586-9ff8-a16aaafb702e',
//   id:'73af51c6-3696-41e1-ae9c-1b784dd988f5',
//   lineUserId: 'Uabcdef1234567890abcdef1234567890',
//   displayName: 'Jane Smith',
// }, {
//   id:'df2c126a-c8fa-4384-906d-9a92d221504e',
//   lineUserId: 'Ufedcba0987654321fedcba0987654321',
//   displayName: 'Alice Johnson',
// }
// ]


function verifySignature(body: string, signature: string) {
  const hash = crypto
    .createHmac('sha256', CHANNEL_SECRET)
    .update(body)
    .digest('base64')

  return hash === signature
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const bodyText = await req.text()
  // console.log("bodyText")
  const signature = req.headers.get('x-line-signature') || ''

  if (!verifySignature(bodyText, signature)) {
    return NextResponse.json(
      { message: 'Invalid signature' },
      { status: 401 }
    )
  }

  const body = JSON.parse(bodyText)
  // console.log("body")
  const events = body.events ?? []
  // console.log("events",events)

  for (const event of events) {
    if (event.type !== 'message') continue
    if (event.message.type !== 'text') continue

    const lineUserId = event.source?.userId
    if (!lineUserId) continue

    /* ===================== CUSTOMER ===================== */
    let { data: customer } = await supabase
      .from('Customer')
      .select('id')
      .eq('lineUserId', lineUserId)
      .single()

    if (!customer) {
      const { data: newCustomer, error } = await supabase
        .from('Customer')
        .insert({ lineUserId: lineUserId })
        .select('id')
        .single()

      if (error) {
        console.error('insert customer error:', error)
        throw error
      }

      customer = newCustomer
    }

    // console.log(customer)

    /* ===================== CONVERSATION ===================== */
    let { data: conversation } = await supabase
      .from('Conversation')
      .select('id')
      .eq('customerId', customer?.id)
      .eq('status', ConversationStatus.OPEN)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single()

    if (!conversation) {
      const payload: CreateConversation = {
        customerId: customer?.id,
        status: ConversationStatus.OPEN,
      }

      const { data: newConversation, error } = await supabase
        .from('Conversation')
        .insert({
          customerId: payload.customerId,
          status: payload.status,
        })
        .select('id')
        .single()

      if (error) {
        console.error('insert customer error:', error)
        throw error
      }

      conversation = newConversation
    }

    // console.log(conversation)

    /* ===================== MESSAGE ===================== */
    const messagePayload: CreateMessage = {
      conversationId: conversation?.id,
      senderType: SenderType.CUSTOMER,
      senderId: customer?.id,
      messageType: MessageType.TEXT,
      content: event.message.text,
      payload: event,
    }

    // console.log(messagePayload)

    const { error } = await supabase.from('Message').insert({
      conversationId: messagePayload.conversationId,
      senderType: messagePayload.senderType,
      senderId: messagePayload.senderId,
      messageType: messagePayload.messageType,
      content: messagePayload.content,
      payload: messagePayload.payload,
    })

    if (error) {
      console.error('insert message error:', error)
      throw error
    }

    /* ===================== UPDATE CONVERSATION ===================== */
    await supabase
      .from('Conversation')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation?.id)
  }

  return NextResponse.json({ ok: true })
}
