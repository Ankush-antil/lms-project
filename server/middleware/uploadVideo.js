const multer = require("multer");
const path = require("path");

const fs = require("fs");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/videos');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const uploadVideo = multer({
    storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500 MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "video/mp4",
            "video/webm",
            "video/ogg",
            "video/quicktime",
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only video files are allowed"));
        }
    },
});

module.exports = uploadVideo;