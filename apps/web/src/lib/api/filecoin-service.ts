import { Synapse } from "@filoz/synapse-sdk";
import { ApiKeyManager } from "./middleware";

const FILECOIN_CALIBRATION_RPC = "https://api.calibration.node.glif.io/rpc/v1";

export interface FilecoinUploadResult {
  cid: string;
  filcdnUrl: string;
  size: number;
  filename: string;
}

export class FilecoinApiService {
  private synapse: any = null;
  private storageService: any = null;
  private config: { privateKey: string; walletAddress: string };

  constructor() {
    this.config = ApiKeyManager.getFilecoinConfig();
  }

  async initialize(): Promise<void> {
    if (this.synapse && this.storageService) {
      return; // Already initialized
    }

    try {
      console.log('🚀 Initializing FilCDN with Synapse SDK...');
      
      this.synapse = await Synapse.create({
        withCDN: true,
        privateKey: this.config.privateKey,
        rpcURL: FILECOIN_CALIBRATION_RPC,
      });

      this.storageService = await this.synapse.createStorageService({
        onProofSetCreationProgress: (progress: any) => {
          if (progress.transactionMined && !progress.proofSetLive) {
            console.log('  Transaction mined, waiting for proof set to be live...');
          }
        },
      });

      console.log('✅ FilCDN service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize FilCDN:', error);
      throw new Error(`FilCDN initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadFile(fileBuffer: Buffer, filename: string): Promise<FilecoinUploadResult> {
    await this.initialize();

    // Check file size limit (254 MiB)
    const maxSize = 254 * 1024 * 1024;
    if (fileBuffer.length > maxSize) {
      throw new Error(`File size ${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB exceeds FilCDN limit of 254MB`);
    }

    try {
      console.log(`📤 Uploading ${filename} to FilCDN...`);

      const fileData = {
        name: filename,
        data: new Uint8Array(fileBuffer),
      };

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
        size: fileBuffer.length,
        filename,
      };
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async downloadFile(cid: string): Promise<Uint8Array> {
    await this.initialize();

    try {
      console.log(`📥 Downloading ${cid} from FilCDN...`);
      const downloadedData = await this.synapse.download(cid);
      console.log(`✅ Downloaded ${cid} successfully`);
      return downloadedData;
    } catch (error) {
      console.error('❌ Download failed:', error);
      throw new Error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDownloadUrl(cid: string): Promise<string> {
    await this.initialize();
    const walletAddress = await this.synapse.getSigner().getAddress();
    return `https://${walletAddress}.calibration.filcdn.io/${cid}`;
  }

  getWalletAddress(): string {
    return this.config.walletAddress;
  }

  isInitialized(): boolean {
    return this.synapse !== null && this.storageService !== null;
  }
}

// Singleton instance
export const filecoinApiService = new FilecoinApiService();
