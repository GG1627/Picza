import * as Crypto from 'expo-crypto';

const CLOUD_NAME = 'dwt4c99su';
const API_KEY = '355173449245645';
const API_SECRET = 'MWKuC5xcERe8H5AEBSYWuSBRL3g';

type UploadType = 'avatar' | 'post';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const uploadToCloudinary = async (base64Image: string, type: UploadType = 'post') => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const formData = new FormData();
      formData.append('file', `data:image/jpeg;base64,${base64Image}`);
      formData.append('upload_preset', 'picza_preset');
      formData.append('cloud_name', CLOUD_NAME);
      formData.append('api_key', API_KEY);

      // Add folder based on upload type - using public_id to specify the folder structure
      const timestamp = new Date().getTime();
      const folder = type === 'avatar' ? 'picza/avatars' : 'picza/posts';
      const publicId = `${folder}/${timestamp}`;
      formData.append('public_id', publicId);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Cloudinary upload failed: ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      if (!data.secure_url) {
        throw new Error('No secure URL returned from Cloudinary');
      }

      return data.secure_url;
    } catch (error) {
      lastError = error as Error;
      console.error(`Upload attempt ${attempt} failed:`, error);

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt); // Exponential backoff
        continue;
      }
    }
  }

  throw new Error(
    `Failed to upload to Cloudinary after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
};

export const deleteFromCloudinary = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extract public_id from the URL
    const urlParts = imageUrl.split('/');
    const publicId = urlParts.slice(-2).join('/').split('.')[0]; // Gets "picza/posts/timestamp" or "picza/avatars/timestamp"

    // Generate timestamp
    const timestamp = Math.floor(Date.now() / 1000);

    // Create signature using expo-crypto
    const signatureString = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
    const signature = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA1,
      signatureString
    );

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', API_KEY);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Cloudinary delete failed: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data.result === 'ok';
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
};

// Helper function to generate SHA-1 hash
async function sha1(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
