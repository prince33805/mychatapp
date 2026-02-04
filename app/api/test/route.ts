import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

export async function GET() {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('Admin')   // ใช้ table ใดก็ได้
        .select('id')
        .limit(1)

    if (error) {
        return NextResponse.json(
            { ok: false, error: error.message },
            { status: 500 }
        )
    }

    return NextResponse.json({
        ok: true,
        message: 'Supabase connected',
        data,
    })
}
