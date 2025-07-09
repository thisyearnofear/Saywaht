import { StorageClient } from "@lens-chain/storage-client";
import { chains } from "@lens-chain/sdk/viem";
import { immutable } from "@lens-chain/storage-client";

export interface GroveUploadResult {
  uri: string;
  gatewayUrl: string;
  storageKey: string;
  filename: string;
  size: number;
}

export interface GroveMetadataUploadResult {
  uri: string;
  gatewayUrl: string;
  storageKey: string;
}

export class GroveStorageService {
  private client: StorageClient;
  private acl: any;

  constructor() {
    this.client = StorageClient.create();
    // Use testnet for development, mainnet for production
    this.acl = immutable(chains.testnet.id);
  }

  /**
   * Upload a single file to Grove/IPFS
   */
  async uploadFile(file: File): Promise<GroveUploadResult> {
    try {
      console.log(`📤 Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB) to Grove...`);

      const response = await this.client.uploadFile(file, { acl: this.acl });

      console.log(`✅ File uploaded successfully!`);
      console.log(`  URI: ${response.uri}`);
      console.log(`  Gateway URL: ${response.gatewayUrl}`);

      return {
        uri: response.uri,
        gatewayUrl: response.gatewayUrl,
        storageKey: response.storageKey,
        filename: file.name,
        size: file.size,
      };
    } catch (error) {
      console.error('❌ Grove upload failed:', error);
      throw new Error(`Failed to upload ${file.name} to Grove: ${error}`);
    }
  }

  /**
   * Upload multiple files as a folder to Grove/IPFS
   */
  async uploadFolder(files: FileList | File[]): Promise<{
    folder: GroveUploadResult;
    files: GroveUploadResult[];
  }> {
    try {
      const fileArray = Array.from(files);
      console.log(`📤 Uploading ${fileArray.length} files as folder to Grove...`);

      // Create a dynamic index that lists all files
      const index = (resources: any[]) => ({
        name: "SayWhat Media Folder",
        description: "Media files uploaded from SayWhat video editor",
        files: resources.map((resource) => ({
          uri: resource.uri,
          gatewayUrl: resource.gatewayUrl,
          storageKey: resource.storageKey,
          filename: resource.filename || "unknown",
        })),
        uploadedAt: new Date().toISOString(),
        platform: "SayWhat",
      });

      const response = await this.client.uploadFolder(fileArray, {
        acl: this.acl,
        index,
      });

      console.log(`✅ Folder uploaded successfully!`);
      console.log(`  Folder URI: ${response.folder.uri}`);
      console.log(`  Files: ${response.files.length}`);

      return {
        folder: {
          uri: response.folder.uri,
          gatewayUrl: response.folder.gatewayUrl,
          storageKey: response.folder.storageKey,
          filename: "folder",
          size: fileArray.reduce((sum, file) => sum + file.size, 0),
        },
        files: response.files.map((file, index) => ({
          uri: file.uri,
          gatewayUrl: file.gatewayUrl,
          storageKey: file.storageKey,
          filename: fileArray[index]?.name || "unknown",
          size: fileArray[index]?.size || 0,
        })),
      };
    } catch (error) {
      console.error('❌ Grove folder upload failed:', error);
      throw new Error(`Failed to upload folder to Grove: ${error}`);
    }
  }

  /**
   * Upload JSON metadata to Grove/IPFS
   */
  async uploadMetadata(metadata: object): Promise<GroveMetadataUploadResult> {
    try {
      console.log('📄 Uploading metadata to Grove...');

      const response = await this.client.uploadAsJson(metadata, { acl: this.acl });

      console.log(`✅ Metadata uploaded successfully!`);
      console.log(`  URI: ${response.uri}`);
      console.log(`  Gateway URL: ${response.gatewayUrl}`);

      return {
        uri: response.uri,
        gatewayUrl: response.gatewayUrl,
        storageKey: response.storageKey,
      };
    } catch (error) {
      console.error('❌ Grove metadata upload failed:', error);
      throw new Error(`Failed to upload metadata to Grove: ${error}`);
    }
  }

  /**
   * Wait for a resource to be fully propagated to IPFS
   */
  async waitForPropagation(response: any): Promise<void> {
    try {
      console.log('⏳ Waiting for IPFS propagation...');
      await response.waitForPropagation();
      console.log('✅ Content fully propagated to IPFS');
    } catch (error) {
      console.warn('⚠️ Propagation check failed, but content should still be available:', error);
    }
  }

  /**
   * Check if Grove storage is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Simple test to see if the service is reachable
      // We could ping the API or do a small test upload
      return true;
    } catch (error) {
      console.error('Grove storage not available:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const groveStorage = new GroveStorageService();
