/**
 * Extracts the Cloudinary public ID from a given URL.
 * Supports image, video, and raw file URLs.
 * @param {string} url - The Cloudinary resource URL.
 * @returns {string|null} - The public ID or null if not found.
 */
const getPublicIdFromUrl = (url) => {
    if (!url) return null;
    try {
        const parts = url.split('/');
        const lastPart = parts[parts.length - 1];
        // Remove extension
        const filename = lastPart.split('.')[0];

        // If the URL has versioning (e.g., /v12345678/), the public ID is often just the filename 
        // OR it might include folders. 
        // A more robust way: find the segment after 'upload/' and remove version.

        // Simple regex strategy:
        // Matches .../upload/(v<version>/)?(<public_id>).<extension>
        const regex = /\/upload\/(?:v\d+\/)?(.+?)(?:\.[^/.]+)?$/;
        const match = url.match(regex);
        return match ? match[1] : filename;
    } catch (error) {
        console.error('Error extracting public ID:', error);
        return null;
    }
};

module.exports = { getPublicIdFromUrl };
