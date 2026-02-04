// app/api/admin/conversations/[id]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_LIMIT = 30;

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = createClient()
    const conversationId = await params

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit")) || DEFAULT_LIMIT;
    const before = searchParams.get("before"); // createdAt cursor

    let query = supabase
        .from('Message')
        .select(`
            id,
            senderType,
            content,
            createdAt
        `)
        .eq('conversationId', conversationId.id)
        .order('createdAt', { ascending: false })
        .limit(limit);

    if (before) {
        query = query.lt("createdAt", before);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error }, { status: 500 })
    }

    // return NextResponse.json(data)
    return NextResponse.json({
        messages: data.reverse(),
        hasMore: data.length === limit,
    });
}
