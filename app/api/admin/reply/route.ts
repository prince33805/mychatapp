import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { SenderType, MessageType } from '@/types/enums'
import { ConversationWithCustomerAndMessages } from '@/types/api/admin-conversations'

type AdminReplyPayload = {
    conversationId: string
    text: string,
    clientId: string
}

async function sendLineMessageWithFallback(
    userId: string,
    text: string,
    replyToken?: string | null
) {
    // 1️⃣ try reply
    if (replyToken) {
        const replyRes = await fetch(
            'https://api.line.me/v2/bot/message/reply',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN!}`,
                },
                body: JSON.stringify({
                    replyToken,
                    messages: [{ type: 'text', text }],
                }),
            }
        )

        if (replyRes.ok) {
            return { ok: true, method: 'reply' as const }
        }

        const err = await replyRes.json()
        console.warn('reply failed, fallback to push', err)

        // ถ้า error ไม่ใช่ token หมด → ควร throw
        if (err?.message !== 'Invalid reply token') {
            return { ok: false, error: err }
        }
    }

    // 2️⃣ fallback → push
    const pushRes = await fetch(
        'https://api.line.me/v2/bot/message/push',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN!}`,
            },
            body: JSON.stringify({
                to: userId,
                messages: [{ type: 'text', text }],
            }),
        }
    )

    if (!pushRes.ok) {
        const err = await pushRes.json()
        return { ok: false, error: err }
    }

    return { ok: true, method: 'push' as const }
}

export async function POST(req: NextRequest) {
    const supabase = createClient()
    const { conversationId, text, clientId }: AdminReplyPayload = await req.json()
    // console.log(conversationId)
    // console.log(text)
    /* ===================== GET CONVERSATION ===================== */
    const { data: conversation, error } = await supabase
        .from('Conversation')
        .select(`
            id,
            Customer (
                lineUserId,
                id
            ),
            Message (
                payload,
                createdAt
            )
        `)
        .eq('id', conversationId)
        .single<ConversationWithCustomerAndMessages>()

    if (error) {
        console.error('Conversation error:', error)
        throw error
    }

    if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    // console.log(conversation)

    const lineUserId = conversation.Customer?.lineUserId
    // console.log(lineUserId)
    const lastReplyToken = conversation.Message?.[0]?.payload?.replyToken ?? null
    // console.log(lastReplyToken)

    /* ===================== SEND TO LINE ===================== */
    const result = await sendLineMessageWithFallback(
        lineUserId,
        text,
        lastReplyToken
    )

    if (!result.ok) {
        // 1️⃣ บันทึก message เป็น failed
        await supabase.from('Message').insert({
            conversationId: conversationId,
            senderType: SenderType.ADMIN,
            clientId: clientId,
            senderId: conversation.Customer?.id || null,
            messageType: MessageType.TEXT,
            content: text,
            payload: {
                error: result,
            },
        })

        return NextResponse.json(
            { error: 'LINE send failed', detail: result },
            { status: 502 }
        )
    }

    const cusId = conversation.Customer?.id
    console.log(cusId)

    /* ===================== SAVE MESSAGE ===================== */
    const { data: message, error: messageError } =
        await supabase.from('Message').insert({
            conversationId: conversationId,
            senderType: SenderType.ADMIN,
            clientId: clientId,
            senderId: conversation.Customer?.id || null,
            messageType: MessageType.TEXT,
            content: text,
            payload: {
                sendMethod: result.method,
            },
        })

    if (messageError) {
        console.error('message error:', messageError)
        throw messageError
    }

    // if (!message) {
    //     return NextResponse.json({ error: 'message not found' }, { status: 404 })
    // }

    /* ===================== UPDATE CONVERSATION ===================== */
    // const { data: updatedConversation, error: conversationError } =
    await supabase
        .from('Conversation')
        .update({ lastMessageAt: new Date().toISOString() })
        .eq('id', conversationId)

    // if (conversationError) {
    //     console.error('updatedConversation error:', error)
    //     throw error
    // }

    // if (!updatedConversation) {
    //     return NextResponse.json({ error: 'updatedConversation not found' }, { status: 404 })
    // }

    return NextResponse.json({ ok: true })
}
