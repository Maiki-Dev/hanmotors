// Cloudinary Configuration
// REPLACE THESE VALUES WITH YOUR OWN FROM CLOUDINARY DASHBOARD
// 1. Log in to Cloudinary
// 2. Go to Settings (gear icon) -> Upload -> Upload presets
// 3. Click "Add upload preset"
// 4. Set "Signing Mode" to "Unsigned"
// 5. Save and copy the "Upload preset name" (e.g., "ml_default")
// 6. Copy your "Cloud name" from the Dashboard (e.g., "demo" or your custom name)

const CLOUD_NAME = "dtqjqv79k"; 
const UPLOAD_PRESET = "ml_default2";

/**
 * Uploads a file to Cloudinary
 * @param {File} file - The file object to upload
 * @returns {Promise<string>} - The secure URL of the uploaded image
 */
export const uploadToCloudinary = async (file) => {
  if (CLOUD_NAME === "YOUR_CLOUD_NAME" || UPLOAD_PRESET === "YOUR_UPLOAD_PRESET") {
    throw new Error("Cloudinary configuration is missing. Please set CLOUD_NAME and UPLOAD_PRESET in src/lib/cloudinary.js");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "hanmotors_avatars"); // Optional: organize in a folder

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Upload failed");
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};
