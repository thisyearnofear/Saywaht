/**
 * Client-side Storacha utilities
 * For frontend operations using delegated capabilities
 */

import { create } from '@storacha/client'
import * as Delegation from '@storacha/client/delegation'
import { StoreMemory } from '@storacha/client/stores/memory'
import type { Client } from '@storacha/client'

export interface ClientStorachaConfig {
  gatewayUrl?: string
}

export interface ClientStorachaInstance {
  client: Client
  gatewayUrl: string
}

/**
 * Initialize client-side Storacha with delegation from backend
 * Frontend generates its own agent keypair and requests limited capabilities
 */
export async function createClientStoracha(
  delegationProof: number[]
): Promise<ClientStorachaInstance> {
  // Create new client (generates agent keypair)
  const client = await create()

  // Parse delegation proof from backend
  const delegation = await Delegation.extract(new Uint8Array(delegationProof))

  if (!delegation.ok) {
    throw new Error('Invalid delegation proof')
  }

  // Add delegation to client's proof store
  await client.addSpace(delegation.ok)

  return {
    client,
    gatewayUrl: 'https://w3s.link'
  }
}

/**
 * Upload file from browser using delegated capabilities
 */
export async function uploadFileToStoracha(
  file: File,
  delegationProof: number[]
): Promise<{ cid: string; url: string; gatewayUrl: string; size: number }> {
  const { client, gatewayUrl } = await createClientStoracha(delegationProof)

  const cid = await client.uploadFile(file)

  return {
    cid: cid.toString(),
    url: `ipfs://${cid}`,
    gatewayUrl: `${gatewayUrl}/ipfs/${cid}`,
    size: file.size
  }
}

/**
 * Request delegation from backend for frontend uploads
 */
export async function requestDelegation(): Promise<{
  delegation: number[]
  expiration: string
}> {
  const response = await fetch('/api/storacha/delegate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })

  if (!response.ok) {
    throw new Error('Failed to get delegation')
  }

  const data = await response.json()
  return {
    delegation: data.delegation,
    expiration: data.expiration
  }
}
