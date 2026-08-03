import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.PERFORMANCE_ENGINE_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(`${BACKEND_URL}/strength/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')
    const userId = searchParams.get('user_id')

    if (!sessionId || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const response = await fetch(`${BACKEND_URL}/strength/sessions/${sessionId}?user_id=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) throw new Error(`Backend error: ${response.statusText}`)

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}
