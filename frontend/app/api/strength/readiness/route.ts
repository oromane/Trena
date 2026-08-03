import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.PERFORMANCE_ENGINE_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    }

    const response = await fetch(`${BACKEND_URL}/strength/readiness?user_id=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) throw new Error(`Backend error: ${response.statusText}`)

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching readiness:', error)
    return NextResponse.json({ error: 'Failed to fetch readiness' }, { status: 500 })
  }
}
