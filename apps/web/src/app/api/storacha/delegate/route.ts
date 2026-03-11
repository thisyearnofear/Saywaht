import { NextRequest, NextResponse } from 'next/server'
import type { Principal } from '@storacha/client/types'
import { Result } from '@storacha/client'

/**
 * POST /api/storacha/delegate
 * Create UCAN delegation for frontend client
 * Allows frontend to upload files with limited, time-bound permissions
 */
export async function POST(req: NextRequest) {
  try {
    const { audienceDid } = await req.json()

    if (!audienceDid) {
      return NextResponse.json(
        { error: 'Missing required field: audienceDid' },
        { status: 400 }
      )
    }

    const { create } = await import('@storacha/client')
    const { Signer } = await import('@storacha/client/principal/ed25519')
    const { StoreMemory } = await import('@storacha/client/stores/memory')

    if (!process.env.STORACHA_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Storacha not configured on server' },
        { status: 503 }
      )
    }

    // Initialize backend client with private key
    const principal = Signer.parse(process.env.STORACHA_PRIVATE_KEY)
    const store = new StoreMemory()
    const client = await create({ principal, store })

    // Define limited capabilities for frontend
    const abilities = ['space/blob/add', 'space/index/add']

    // Delegation expires in 24 hours
    const expiration = Math.floor(Date.now() / 1000) + 60 * 60 * 24

    // Create delegation for frontend agent
    const delegation = await client.createDelegation(
      audienceDid as Principal,
      abilities,
      { expiration }
    )

    // Serialize delegation for transfer
    const serialized = await delegation.archive()
    const serializedBytes = Result.unwrap(serialized)

    return NextResponse.json({
      success: true,
      delegation: Array.from(serializedBytes),
      expiration: new Date(expiration * 1000).toISOString()
    })
  } catch (error) {
    console.error('Storacha delegation error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Delegation failed',
        success: false
      },
      { status: 500 }
    )
  }
}
