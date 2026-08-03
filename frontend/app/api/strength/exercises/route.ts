import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.PERFORMANCE_ENGINE_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const muscle = searchParams.get('muscle')
    const limit = searchParams.get('limit') || '100'
    const offset = searchParams.get('offset') || '0'

    let url = `${BACKEND_URL}/strength/exercises?limit=${limit}&offset=${offset}`
    if (muscle) url += `&muscle=${muscle}`

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) throw new Error(`Backend error: ${response.statusText}`)

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching exercises:', error)
    return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 })
  }
}
