import { Synapse } from '@filoz/synapse-sdk';
import { ethers } from 'ethers';

// FilCDN Configuration
const FILECOIN_CALIBRATION_RPC = 'https://api.calibration.node.glif.io/rpc/v1';

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
  private synapse: Synapse | null = null;
  private storageService: any = null;
  private config: FilCDNConfig;

  constructor(config: FilCDNConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (!this.config.privateKey) {
      throw new Error('Private key is required for FilCDN operations');
    }

    try {
      console.log('🚀 Initializing FilCDN with Synapse SDK...');
      
      this.synapse = await Synapse.create({
        withCDN: true,
        privateKey: this.config.privateKey,
        rpcURL: FILECOIN_CALIBRATION_RPC,
      });

      console.log('✅ FilCDN Synapse SDK initialized');

      // Create storage service with callbacks for monitoring
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
          onProofSetCreationStarted: (transaction: any, statusUrl: any) => {
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

      if (!preflight.allowanceCheck.sufficient) {
        throw new Error(
          'Allowance not sufficient. Please increase your allowance via the FilCDN web app: https://fs-upload-dapp.netlify.app'
        );
      }

      // Upload the file
      const uploadResult = await this.storageService.upload(fileData);
      const cid = uploadResult.commp;

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
      throw new Error('FilCDN service not initialized. Call initialize() first.');
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

export function getFilCDNService(): FilCDNService {
  if (!filcdnService) {
    filcdnService = new FilCDNService({
      privateKey: process.env.NEXT_PUBLIC_FILECOIN_PRIVATE_KEY,
      walletAddress: process.env.NEXT_PUBLIC_FILECOIN_WALLET_ADDRESS,
    });
  }
  return filcdnService;
}

// Helper function to initialize the service
export async function initializeFilCDN(): Promise<FilCDNService> {
  const service = getFilCDNService();
  if (!service.isInitialized()) {
    await service.initialize();
  }
  return service;
}

// Helper to check if FilCDN is properly configured
export function isFilCDNConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FILECOIN_PRIVATE_KEY || 
    process.env.NEXT_PUBLIC_FILECOIN_WALLET_ADDRESS
  );
}
