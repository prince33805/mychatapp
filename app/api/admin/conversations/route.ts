// app/api/admin/conversations/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { ConversationListItem, ConversationQueryRow } from '@/types/api/admin-conversations'

export async function GET() {
    const supabase = createClient()
    const { data, error } = await supabase
        .from('Conversation')
        .select(`
            id,
            lastMessageAt,
            Customer (
                id,
                lineUserId,
                displayName
            ),
            Message (
                content,
                senderType,
                createdAt
            )
        `)
        .order('lastMessageAt', { ascending: false })
        .order('createdAt', {
            foreignTable: 'Message',
            ascending: false,
        })
        .limit(1, { foreignTable: 'Message' })
        .returns<ConversationQueryRow[]>()

    if (error) {
        return NextResponse.json({ error }, { status: 500 })
    }

    // map ให้เหมาะกับ sidebar
    // Check if data is an array
    if (Array.isArray(data)) {
        // Use the map function
        const result: ConversationListItem[] = data.map((c: any) => {
            // Rest of the code
            const lastMessage = c.Message[0]

            return {
                conversationId: c.id,
                customerId: c.Customer.id,
                lineUserId: c.Customer.lineUserId,
                displayName: c.Customer.displayName,

                lastMessage: lastMessage?.content ?? '',
                lastSender: lastMessage?.senderType ?? 'CUSTOMER',
                lastMessageAt: c.lastMessageAt,
            }
        });
        return NextResponse.json(result)

    } else {
        // Handle the case when data is not an array
        return NextResponse.json({ message: 'Data is not an array' }, { status: 500 })
    }
}
