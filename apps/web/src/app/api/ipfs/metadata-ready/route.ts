import { NextRequest, NextResponse } from "next/server";
import { validateMetadataJSON } from "@zoralabs/coins-sdk";

const DEFAULT_TIMEOUT_MS = 15000;
const MAX_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampTimeout(value: unknown) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.min(Math.max(numeric, 2000), MAX_TIMEOUT_MS);
}

function extractIpfsHash(value?: string | null) {
  if (!value) return "";

  if (value.startsWith("ipfs://")) {
    return value.replace("ipfs://", "").trim();
  }

  if (value.startsWith("lens://")) {
    return value.replace("lens://", "").trim();
  }

  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);

    if (segments[0] === "ipfs" && segments[1]) {
      return segments[1];
    }

    return segments[0] || "";
  } catch {
    return "";
  }
}

function getGatewayCandidates(ipfsHash: string, gatewayUrl?: string | null) {
  return Array.from(
    new Set(
      [
        gatewayUrl || "",
        ipfsHash ? `https://api.grove.storage/${ipfsHash}` : "",
        ipfsHash ? `https://magic.decentralized-content.com/ipfs/${ipfsHash}` : "",
        ipfsHash ? `https://dweb.link/ipfs/${ipfsHash}` : "",
        ipfsHash ? `https://w3s.link/ipfs/${ipfsHash}` : "",
      ].filter(Boolean)
    )
  );
}

async function metadataReadyAt(url: string) {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get("content-type") || "";

    if (
      !contentType.includes("application/json") &&
      !contentType.includes("text/plain")
    ) {
      return false;
    }

    const payload = await response.json();
    validateMetadataJSON(payload);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const timeoutMs = clampTimeout(body?.timeoutMs);
  const ipfsHash = extractIpfsHash(body?.uri) || extractIpfsHash(body?.gatewayUrl);
  const candidates = getGatewayCandidates(ipfsHash, body?.gatewayUrl);

  if (candidates.length === 0) {
    return NextResponse.json(
      { ready: false, error: "No metadata gateway candidates available" },
      { status: 400 }
    );
  }

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const candidate of candidates) {
      if (await metadataReadyAt(candidate)) {
        return NextResponse.json({ ready: true, url: candidate });
      }
    }

    if (Date.now() + POLL_INTERVAL_MS < deadline) {
      await sleep(POLL_INTERVAL_MS);
    } else {
      break;
    }
  }

  return NextResponse.json({
    ready: false,
    error: "Timed out waiting for metadata propagation",
  });
}
