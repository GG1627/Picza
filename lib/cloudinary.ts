const CLOUD_NAME = 'dwt4c99su';
const API_KEY = '355173449245645';
const API_SECRET = 'MWKuC5xcERe8H5AEBSYWuSBRL3g';

type UploadType = 'avatar' | 'post';

export const uploadToCloudinary = async (base64Image: string, type: UploadType = 'post') => {
  try {
    const formData = new FormData();
    formData.append('file', `data:image/jpeg;base64,${base64Image}`);
    formData.append('upload_preset', 'picza_preset'); // You'll need to create this in your Cloudinary settings
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

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

export const deleteFromCloudinary = async (imageUrl: string): Promise<boolean> => {
  try {
    // Extract public_id from the URL
    const urlParts = imageUrl.split('/');
    const publicId = urlParts.slice(-2).join('/').split('.')[0]; // Gets "picza/posts/timestamp" or "picza/avatars/timestamp"

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', API_KEY);
    formData.append('cloud_name', CLOUD_NAME);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    return data.result === 'ok';
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
};
