import { Synapse } from "@filoz/synapse-sdk";
import { ApiKeyManager } from "./middleware";
import { handleError, withRetry, groveCircuitBreaker } from "../error-handler";
import { recordCustomMetric } from "../performance-monitor";
import { log } from "../logger";

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
    try {
      this.config = ApiKeyManager.getFilecoinConfig();
    } catch (error) {
      // ENHANCEMENT: Graceful degradation with user-friendly error
      handleError(error, 'Filecoin service initialization');
      this.config = {
        privateKey: '',
        walletAddress: ''
      };
    }
  }

  async initialize(): Promise<void> {
    if (this.synapse && this.storageService) {
      return; // Already initialized
    }

    // ENHANCEMENT: Graceful degradation when config missing
    if (!this.config.privateKey || !this.config.walletAddress) {
      const error = new Error('Filecoin configuration is missing. Please set FILECOIN_PRIVATE_KEY and FILECOIN_WALLET_ADDRESS environment variables.');
      handleError(error, 'Filecoin initialization');
      throw error;
    }

    try {
      log.info('Initializing FilCDN with Synapse SDK', null, 'FilCDN');
      
      this.synapse = await Synapse.create({
        withCDN: true,
        privateKey: this.config.privateKey,
        rpcURL: FILECOIN_CALIBRATION_RPC,
      });

      this.storageService = await this.synapse.createStorageService({
        onProofSetCreationProgress: (progress: any) => {
          if (progress.transactionMined && !progress.proofSetLive) {
            log.debug('Transaction mined, waiting for proof set to be live', null, 'FilCDN');
          }
        },
      });

      log.info('FilCDN service initialized', null, 'FilCDN');
    } catch (error) {
      handleError(error, 'FilCDN initialization');
      throw error;
    }
  }

  async uploadFile(fileBuffer: Buffer, filename: string): Promise<FilecoinUploadResult> {
    // PERFORMANT: Use circuit breaker for external service
    const uploadStartTime = performance.now();
    return groveCircuitBreaker.execute(async () => {
      await this.initialize();

      // Check file size limit (254 MiB)
      const maxSize = 254 * 1024 * 1024;
      if (fileBuffer.length > maxSize) {
        const error = new Error(`File size ${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB exceeds FilCDN limit of 254MB`);
        handleError(error, 'File upload validation');
        throw error;
      }

      // ENHANCEMENT: Retry with exponential backoff
      return withRetry(async () => {
        log.info(`Uploading ${filename} to FilCDN`, { filename }, 'FilCDN');

        const fileData = {
          name: filename,
          data: new Uint8Array(fileBuffer),
        };

        const uploadResult = await this.storageService.upload(fileData);
        const cid = uploadResult.commp;

        // Generate FilCDN URL
        const walletAddress = await this.synapse.getSigner().getAddress();
        const filcdnUrl = `https://${walletAddress}.calibration.filcdn.io/${cid}`;

        log.info('File uploaded successfully', { cid, filcdnUrl }, 'FilCDN');

        // PERFORMANT: Track upload performance
        const uploadDuration = performance.now() - uploadStartTime;
        recordCustomMetric('file-upload-duration', uploadDuration, 'ms', {
          filename,
          fileSize: fileBuffer.length,
          fileSizeMB: (fileBuffer.length / 1024 / 1024).toFixed(2),
          success: true
        });

        return {
          cid,
          filcdnUrl,
          size: fileBuffer.length,
          filename,
        };
      }, 3, 2000);
    });
  }

  async downloadFile(cid: string): Promise<Uint8Array> {
    await this.initialize();

    try {
      log.info(`Downloading ${cid} from FilCDN`, { cid }, 'FilCDN');
      const downloadedData = await this.synapse.download(cid);
      log.info(`Downloaded ${cid} successfully`, { cid }, 'FilCDN');
      return downloadedData;
    } catch (error) {
      log.error('Download failed', error, 'FilCDN');
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
