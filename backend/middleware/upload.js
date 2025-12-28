const multer = require('multer');
const path = require('path');


const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept all file types
  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
  fileFilter: fileFilter,
});

module.exports = upload;

