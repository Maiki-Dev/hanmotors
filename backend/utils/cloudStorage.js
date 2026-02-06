const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer - The file buffer
 * @param {string} folder - The folder to upload to (default: 'khanmotors')
 * @returns {Promise<object>} - The Cloudinary upload result
 */
const uploadToCloudinary = (buffer, folder = 'khanmotors') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto' // auto-detect image, video, raw
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - The public ID of the file
 */
const deleteFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Cloudinary Delete Error:', error);
        throw error;
    }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };
