// FilCDN Configuration
const FILECOIN_CALIBRATION_RPC =
  process.env.NEXT_PUBLIC_FILECOIN_CALIBRATION_RPC ||
  process.env.FILECOIN_CALIBRATION_RPC ||
  'https://api.calibration.node.glif.io/rpc/v1';

const FILECOIN_PRIVATE_KEY_PLACEHOLDER_MARKERS = [
  "your-private-key",
  "your_private_key",
  "placeholder",
  "changeme",
  "example",
];

export function normalizeAndValidateFilecoinPrivateKey(rawPrivateKey?: string): string {
  if (!rawPrivateKey || !rawPrivateKey.trim()) {
    throw new Error("FilCDN configuration error: FILECOIN_PRIVATE_KEY is missing.");
  }

  const trimmed = rawPrivateKey.trim();
  const lowered = trimmed.toLowerCase();

  if (FILECOIN_PRIVATE_KEY_PLACEHOLDER_MARKERS.some((marker) => lowered.includes(marker))) {
    throw new Error(
      "FilCDN configuration error: FILECOIN_PRIVATE_KEY is still a placeholder. " +
      "Set a real 32-byte hex private key (64 hex chars, optionally prefixed with 0x)."
    );
  }

  const normalized = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error(
      "FilCDN configuration error: FILECOIN_PRIVATE_KEY must be a valid 32-byte hex key " +
      "(0x + 64 hex characters)."
    );
  }

  return normalized;
}

export interface UploadResult {
  cid: string;
  filcdnUrl: string;
  size: number;
  filename: string;
}

export interface FilCDNConfig {
  privateKey?: string;
  walletAddress?: string;
}

export class FilCDNService {
  private synapse: any = null;
  private storageService: any = null;
  private config: FilCDNConfig;

  constructor(config: FilCDNConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    const normalizedPrivateKey = normalizeAndValidateFilecoinPrivateKey(this.config.privateKey);

    try {
      console.log('🚀 Initializing FilCDN with Synapse SDK...');
      const { Synapse } = await import('@filoz/synapse-sdk');
      this.synapse = await Synapse.create({
        withCDN: true,
        privateKey: normalizedPrivateKey,
        rpcURL: FILECOIN_CALIBRATION_RPC,
      });
      console.log('✅ FilCDN Synapse SDK initialized');
      this.storageService = await this.synapse.createStorage({
        callbacks: {
          onProviderSelected: (provider: any) => {
            console.log(`✓ Selected storage provider: ${provider.owner}`);
            console.log(`  PDP URL: ${provider.pdpUrl}`);
          },
          onProofSetResolved: (info: any) => {
            if (info.isExisting) {
              console.log(`✓ Using existing proof set: ${info.proofSetId}`);
            } else {
              console.log(`✓ Created new proof set: ${info.proofSetId}`);
            }
          },
          onProofSetCreationStarted: (transaction: any) => {
            console.log(`  Creating proof set, tx: ${transaction.hash}`);
          },
          onProofSetCreationProgress: (progress: any) => {
            if (progress.transactionMined && !progress.proofSetLive) {
              console.log('  Transaction mined, waiting for proof set to be live...');
            }
          },
        },
      });
      console.log('✅ Storage service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize FilCDN:', error);
      throw error;
    }
  }

  async uploadFile(file: File): Promise<UploadResult> {
    if (!this.synapse || !this.storageService) {
      throw new Error('FilCDN service not initialized. Call initialize() first.');
    }

    // Check file size limit (254 MiB)
    const maxSize = 254 * 1024 * 1024; // 254 MiB in bytes
    if (file.size > maxSize) {
      throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds FilCDN limit of 254MB`);
    }

    try {
      console.log(`📤 Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB) to FilCDN...`);

      // Convert File to ArrayBuffer
      const fileData = await file.arrayBuffer();

      // Run preflight checks
      const preflight = await this.storageService.preflightUpload(fileData.byteLength);
      if (!preflight.allowanceCheck?.sufficient) {
        const webAppUrl = process.env.NEXT_PUBLIC_FILCDN_WEB_APP_URL || 'https://filcdn.com';
        throw new Error(`Allowance not sufficient. Increase your FilCDN allowance: ${webAppUrl}`);
      }

      // Upload the file
      const uploadResult = await this.storageService.upload(fileData);
      const cid = uploadResult.commp?.toString?.() ?? String(uploadResult.commp);

      // Generate FilCDN URL
      const walletAddress = await this.synapse.getSigner().getAddress();
      const filcdnUrl = `https://${walletAddress}.calibration.filcdn.io/${cid}`;

      console.log(`✅ File uploaded successfully!`);
      console.log(`  CID: ${cid}`);
      console.log(`  FilCDN URL: ${filcdnUrl}`);

      return {
        cid,
        filcdnUrl,
        size: file.size,
        filename: file.name,
      };
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error;
    }
  }

  async downloadFile(cid: string): Promise<Uint8Array> {
    if (!this.synapse) {
      throw new Error('FilCDN service not initialized. Call initialize() first.');
    }

    try {
      console.log(`📥 Downloading ${cid} from FilCDN...`);
      const downloadedData = await this.synapse.download(cid);
      console.log(`✅ Downloaded ${cid} successfully`);
      return downloadedData;
    } catch (error) {
      console.error('❌ Download failed:', error);
      throw error;
    }
  }

  async getDownloadUrl(cid: string): Promise<string> {
    if (!this.synapse) {
      return '';
    }

    const walletAddress = await this.synapse.getSigner().getAddress();
    return `https://${walletAddress}.calibration.filcdn.io/${cid}`;
  }

  getWalletAddress(): string | null {
    return this.config.walletAddress || null;
  }

  isInitialized(): boolean {
    return this.synapse !== null && this.storageService !== null;
  }
}

// Singleton instance
let filcdnService: FilCDNService | null = null;

// Updated to use secure server-side API
export class SecureFilCDNService {
  async uploadFile(file: File): Promise<UploadResult> {
    // Check file size limit (254 MiB)
    const maxSize = 254 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds FilCDN limit of 254MB`);
    }

    try {
      console.log(`📤 Uploading ${file.name} via secure API...`);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/filecoin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      console.log(`✅ File uploaded successfully via secure API!`);
      return data.data;
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error;
    }
  }

  // Legacy methods for compatibility
  async downloadFile(cid: string): Promise<Uint8Array> {
    throw new Error('Download functionality moved to server-side for security');
  }

  async getDownloadUrl(cid: string): Promise<string> {
    throw new Error('Download URL generation moved to server-side for security');
  }

  getWalletAddress(): string | null {
    return null; // Wallet address is now server-side only
  }

  isInitialized(): boolean {
    return true; // Always ready since we use API routes
  }
}

export function getFilCDNService(): SecureFilCDNService {
  if (!filcdnService) {
    filcdnService = new SecureFilCDNService() as any;
  }
  return filcdnService as any;
}

// Helper function to initialize the service
export async function initializeFilCDN(): Promise<SecureFilCDNService> {
  const service = getFilCDNService();
  // No initialization needed for secure API-based service
  return service;
}

// Helper to check if FilCDN is properly configured
export async function isFilCDNConfigured(): Promise<{ configured: boolean; allowanceSufficient: boolean; walletAddress?: string }> {
  try {
    const res = await fetch('/api/filecoin/status', { method: 'GET' });
    if (!res.ok) {
      return { configured: false, allowanceSufficient: false };
    }
    const data = await res.json();
    return {
      configured: !!data.configured,
      allowanceSufficient: !!data.allowanceSufficient,
      walletAddress: data.walletAddress || undefined,
    };
  } catch {
    return { configured: false, allowanceSufficient: false };
  }
}

// Client-side wallet-based upload (Advanced)
export async function uploadViaWallet(file: File): Promise<UploadResult> {
  if (typeof window === 'undefined') {
    throw new Error('Wallet upload is only available in the browser');
  }
  const eth = (window as any).ethereum;
  if (!eth) {
    throw new Error('No wallet provider found');
  }

  // Size limit parity with FilCDN
  const maxSize = 254 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds FilCDN limit of 254MB`);
  }

  const { BrowserProvider } = await import('ethers');
  const provider = new BrowserProvider(eth);
  const signer = await provider.getSigner();

  const { Synapse } = await import('@filoz/synapse-sdk');
  const synapse = await Synapse.create({
    withCDN: true,
    signer,
    rpcURL: FILECOIN_CALIBRATION_RPC,
  });

  const storageService = await synapse.createStorage({});

  const fileData = await file.arrayBuffer();
  const preflight = await storageService.preflightUpload(fileData.byteLength);
  if (!preflight?.allowanceCheck?.sufficient) {
    const webAppUrl = process.env.NEXT_PUBLIC_FILCDN_WEB_APP_URL || 'https://filcdn.com';
    throw new Error(`Allowance not sufficient. Increase your FilCDN allowance: ${webAppUrl}`);
  }

  const uploadResult = await storageService.upload(fileData);
  const cid = uploadResult.commp?.toString?.() ?? String(uploadResult.commp);
  const walletAddress = await synapse.getSigner().getAddress();
  const filcdnUrl = `https://${walletAddress}.calibration.filcdn.io/${cid}`;

  return {
    cid,
    filcdnUrl,
    size: file.size,
    filename: file.name,
  };
}

export async function checkClientPreflight(): Promise<{ allow: boolean; error?: string }> {
  try {
    if (typeof window === 'undefined') return { allow: false, error: 'not-browser' };
    const eth = (window as any).ethereum;
    if (!eth) return { allow: false, error: 'no-wallet' };
    
    const { BrowserProvider } = await import('ethers');
    const provider = new BrowserProvider(eth);
    const signer = await provider.getSigner();
    
    const { Synapse } = await import('@filoz/synapse-sdk');
    const synapse = await Synapse.create({ withCDN: true, signer, rpcURL: FILECOIN_CALIBRATION_RPC });
    const storageService = await synapse.createStorage({});
    const preflight = await storageService.preflightUpload(1);
    return { allow: !!preflight?.allowanceCheck?.sufficient };
  } catch (e) {
    return { allow: false, error: e instanceof Error ? e.message : String(e) };
  }
}
