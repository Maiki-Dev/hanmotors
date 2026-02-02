// Cloudinary Configuration for Driver App
// REPLACE THESE VALUES
const CLOUD_NAME = "dtqjqv79k"; 
const UPLOAD_PRESET = "ml_default2"; 

/**
 * Uploads a file to Cloudinary
 * @param {object} imageAsset - The asset object from expo-image-picker
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
export const uploadToCloudinary = async (imageAsset) => {
  if (CLOUD_NAME === "YOUR_CLOUD_NAME" || UPLOAD_PRESET === "YOUR_UPLOAD_PRESET") {
    throw new Error("Cloudinary configuration is missing in src/utils/cloudinary.js");
  }

  const formData = new FormData();
  
  // React Native FormData expects specific object structure for files
  const file = {
    uri: imageAsset.uri,
    type: imageAsset.mimeType || 'image/jpeg',
    name: imageAsset.fileName || `upload-${Date.now()}.jpg`,
  };

  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "hanmotors_drivers");

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
        headers: {
          'Accept': 'application/json',
          // Content-Type must be left undefined for multipart/form-data in React Native
          // so that the browser/engine can set the boundary automatically
        },
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || "Upload failed");
    }

    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};
