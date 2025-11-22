/**
 * Google Cloud Storage Helper
 * Direct upload to newimagesndma bucket - NO BACKEND NEEDED! 🚀
 * 
 * Bucket: newimagesndma (allUsers has Storage Object Admin permission)
 * Features:
 * - Upload images directly to GCS from React Native
 * - No backend server needed
 * - Get instant public URLs
 * - AsyncStorage for offline access
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// GCS Configuration for PUBLIC bucket
const GCS_CONFIG = {
  bucketName: 'newimagesndma',
  projectId: 'axiomatic-skill-473605-i3',
  
  // Get public URL for a file
  getPublicUrl: (fileName) => `https://storage.googleapis.com/newimagesndma/${fileName}`,
  
  // Upload endpoint for public bucket (allUsers has Storage Object Admin)
  uploadEndpoint: (fileName) => 
    `https://storage.googleapis.com/upload/storage/v1/b/newimagesndma/o?uploadType=media&name=${encodeURIComponent(fileName)}`,
};

/**
 * Upload file to GCS - DIRECT UPLOAD (No Backend!) 🎯
 * Works because newimagesndma bucket has allUsers with Storage Object Admin permission
 * @param {string} fileUri - Local file URI (from ImagePicker)
 * @param {string} folder - Folder name (e.g., 'profiles', 'csv', 'images')
 * @param {string} fileName - Custom file name (optional)
 * @param {string} contentType - MIME type (default: image/jpeg)
 * @returns {Promise<string>} Public GCS URL
 */
export const uploadToGCS = async (fileUri, folder = 'uploads', fileName = null, contentType = 'image/jpeg') => {
  try {
    // Generate unique filename if not provided
    if (!fileName) {
      const timestamp = Date.now();
      const extension = fileUri.split('.').pop() || 'jpg';
      const randomId = Math.random().toString(36).substr(2, 9);
      fileName = `${folder}/${timestamp}_${randomId}.${extension}`;
    } else {
      fileName = `${folder}/${fileName}`;
    }
    
    console.log(`📤 Uploading to GCS: ${fileName}`);
    
    // Read file as blob
    const response = await fetch(fileUri);
    const blob = await response.blob();
    
    // Upload directly to GCS public bucket
    const uploadUrl = GCS_CONFIG.uploadEndpoint(fileName);
    console.log('🔗 Upload URL:', uploadUrl);
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
      },
      body: blob,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ GCS Upload failed:', uploadResponse.status, errorText);
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const publicUrl = GCS_CONFIG.getPublicUrl(fileName);
    console.log('✅ File uploaded to GCS:', publicUrl);
    
    // Store URL in AsyncStorage for offline access
    await AsyncStorage.setItem(`@file_${fileName}`, publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error('❌ GCS upload error:', error);
    throw error;
  }
};

/**
 * Upload profile picture
 * @param {string} imageUri - Local image URI
 * @param {string} userId - User ID or email
 * @returns {Promise<string>} Public URL
 */
export const uploadProfilePicture = async (imageUri, userId) => {
  const safeUserId = userId.replace(/[@.]/g, '_');
  const fileName = `${safeUserId}_${Date.now()}.jpg`;
  const publicUrl = await uploadToGCS(imageUri, 'profiles', fileName, 'image/jpeg');
  
  // Save to AsyncStorage for offline access
  await AsyncStorage.setItem(`@profile_pic_${userId}`, publicUrl);
  
  return publicUrl;
};

/**
 * Upload CSV file
 * @param {string} fileUri - Local CSV file URI
 * @param {string} fileName - Custom file name
 * @returns {Promise<string>} Public URL
 */
export const uploadCSV = async (fileUri, fileName) => {
  return await uploadToGCS(fileUri, 'csv', fileName, 'text/csv');
};

/**
 * Upload image
 * @param {string} imageUri - Local image URI
 * @param {string} folder - Subfolder (optional)
 * @returns {Promise<string>} Public URL
 */
export const uploadImage = async (imageUri, folder = 'images') => {
  const timestamp = Date.now();
  const fileName = `img_${timestamp}.jpg`;
  return await uploadToGCS(imageUri, folder, fileName, 'image/jpeg');
};

/**
 * Upload training report image
 * @param {string} imageUri - Local image URI
 * @param {string} reportId - Report ID
 * @returns {Promise<string>} Public URL
 */
export const uploadTrainingImage = async (imageUri, reportId) => {
  const fileName = `training_${reportId}_${Date.now()}.jpg`;
  return await uploadToGCS(imageUri, 'training-reports', fileName, 'image/jpeg');
};

/**
 * Get profile picture from storage
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} Cached URL or null
 */
export const getProfilePicture = async (userId) => {
  try {
    const url = await AsyncStorage.getItem(`@profile_pic_${userId}`);
    return url;
  } catch (error) {
    console.error('Error loading profile picture:', error);
    return null;
  }
};

/**
 * Delete file from GCS (requires authentication - use with caution)
 * Note: This won't work without proper auth. Keep files or implement backend for deletion.
 */
export const deleteFromGCS = async (fileName) => {
  console.warn('⚠️ Delete operation requires authentication. File will remain in bucket.');
  // For now, just remove from AsyncStorage
  try {
    await AsyncStorage.removeItem(`@file_${fileName}`);
  } catch (error) {
    console.error('Error removing from storage:', error);
  }
};

/**
 * List files (mock - requires backend or proper auth)
 * For now, returns cached URLs from AsyncStorage
 */
export const listFiles = async (prefix = '') => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const fileKeys = keys.filter(key => key.startsWith('@file_'));
    const files = [];
    
    for (const key of fileKeys) {
      const url = await AsyncStorage.getItem(key);
      if (url) {
        files.push({ key, url });
      }
    }
    
    return files;
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
};

export default {
  uploadToGCS,
  uploadProfilePicture,
  uploadCSV,
  uploadImage,
  uploadTrainingImage,
  getProfilePicture,
  deleteFromGCS,
  listFiles,
  GCS_CONFIG,
};
