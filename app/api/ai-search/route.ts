import { NextResponse } from 'next/server'
import { searchCrm } from '@/lib/crm/search'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const query = typeof body?.query === 'string' ? body.query : ''
    const timeZone = typeof body?.timeZone === 'string' ? body.timeZone : 'America/New_York'

    const result = await searchCrm(query, { timeZone })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        cards: [],
        debug: {
          rawQuery: '',
          source: 'fallback',
          plan: null,
          customerMatches: 0,
          jobMatches: 0,
          returnedCards: 0,
          errors: [error instanceof Error ? error.message : 'Unknown CRM search error'],
        },
      },
      { status: 500 }
    )
  }
}
