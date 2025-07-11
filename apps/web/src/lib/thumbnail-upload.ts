import { groveStorage } from './grove-storage';

/**
 * Upload a thumbnail image to Grove storage
 * @param dataUrl - The data URL of the image (e.g., from canvas.toDataURL())
 * @returns Object with both gateway URL (for display) and IPFS URI (for metadata)
 */
export async function uploadThumbnailToGrove(dataUrl: string): Promise<{
  displayUrl: string;
  metadataUrl: string;
}> {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Create a File object from the blob
    const file = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });

    console.log('📸 Uploading thumbnail to Grove...');

    // Upload to Grove
    const result = await groveStorage.uploadFile(file);

    // Convert lens:// URI to ipfs:// format for blockchain compatibility
    let ipfsUri = result.gatewayUrl; // fallback to gateway URL

    if (result.uri && result.uri.startsWith('lens://')) {
      const ipfsHash = result.uri.replace('lens://', '');
      ipfsUri = `ipfs://${ipfsHash}`;
      console.log('✅ Thumbnail uploaded successfully:');
      console.log('  Lens URI:', result.uri);
      console.log('  IPFS URI:', ipfsUri);
      console.log('  Gateway URL:', result.gatewayUrl);
    } else {
      console.log('✅ Thumbnail uploaded successfully:', result.gatewayUrl);
    }

    // Return both URLs - gateway for display, IPFS for metadata
    return {
      displayUrl: result.gatewayUrl, // Use gateway URL for browser display
      metadataUrl: ipfsUri // Use IPFS URI for blockchain metadata
    };
  } catch (error) {
    console.error('❌ Failed to upload thumbnail:', error);
    throw new Error('Failed to upload thumbnail to Grove storage');
  }
}

/**
 * Process and prepare a thumbnail for metadata
 * @param thumbnailSource - Either a data URL, HTTPS URL, or IPFS URL
 * @returns A valid HTTPS URL for the thumbnail
 */
export async function processThumbnailForMetadata(thumbnailSource: string | null): Promise<string> {
  if (!thumbnailSource) {
    // Return a minimal valid image data URL
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  }

  // If it's already an HTTPS URL, use it directly
  if (thumbnailSource.startsWith('https://')) {
    return thumbnailSource;
  }

  // If it's an IPFS URL, convert to Grove gateway URL for better reliability
  if (thumbnailSource.startsWith('ipfs://')) {
    const ipfsHash = thumbnailSource.replace('ipfs://', '');
    return `https://api.grove.storage/${ipfsHash}`;
  }

  // If it's a lens:// URL, convert to Grove gateway URL
  if (thumbnailSource.startsWith('lens://')) {
    const ipfsHash = thumbnailSource.replace('lens://', '');
    return `https://api.grove.storage/${ipfsHash}`;
  }

  // If it's a data URL, upload it to Grove and return gateway URL
  if (thumbnailSource.startsWith('data:')) {
    try {
      const result = await uploadThumbnailToGrove(thumbnailSource);
      return result.displayUrl; // Return Grove gateway URL for metadata
    } catch (error) {
      console.error('Failed to upload thumbnail, using data URL directly');
      return thumbnailSource;
    }
  }
  
  // For any other format, try to make it absolute
  if (thumbnailSource.startsWith('/')) {
    return `https://saywhat.app${thumbnailSource}`;
  }
  
  // Default: return as-is
  return thumbnailSource;
}