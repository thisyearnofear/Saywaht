import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/storacha/captions
 * Store caption transcripts permanently on Storacha
 * Server-side only - uses private key from environment
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { transcript, segments, language = 'en' } = body

    if (!transcript || !segments) {
      return NextResponse.json(
        { error: 'Missing required fields: transcript and segments' },
        { status: 400 }
      )
    }

    const { storachaStorage } = await import('@/lib/storacha-storage')

    if (!storachaStorage.isAvailable()) {
      return NextResponse.json(
        { error: 'Storacha storage not configured' },
        { status: 503 }
      )
    }

    const result = await storachaStorage.storeCaptions(transcript, segments, language)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Storacha caption upload error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
        success: false
      },
      { status: 500 }
    )
  }
}
