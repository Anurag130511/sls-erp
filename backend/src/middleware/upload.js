const multer = require('multer');

const ALLOWED_EXTENSIONS = /\.(xlsx|xls|csv)$/i;

// Files are kept in memory (not written to disk) since they're parsed
// immediately and discarded — no need to persist the raw upload.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_EXTENSIONS.test(file.originalname)) {
      return cb(new Error('Only .xlsx, .xls or .csv files are supported'));
    }
    cb(null, true);
  },
});

module.exports = upload;
