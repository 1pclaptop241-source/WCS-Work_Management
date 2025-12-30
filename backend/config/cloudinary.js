const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a buffer to Cloudinary
 * @param {Buffer} buffer - The file buffer
 * @param {String} folder - Optional folder name
 * @returns {Promise} - Resolves with result object, rejects with error
 */
const uploadToCloudinary = (buffer, folder = 'wcs-work-management', resourceType = 'auto') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: resourceType, // 'auto', 'image', 'video', or 'raw'
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        uploadStream.end(buffer);
    });
};

module.exports = {
    cloudinary,
    uploadToCloudinary
};
