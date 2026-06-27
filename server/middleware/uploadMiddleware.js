const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ─── Institute Image Upload ───────────────────────────────────────────────────
const instituteImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/institutes');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `institute_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
        cb(null, uniqueName);
    }
});

const instituteImageFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
};

const uploadInstituteImage = multer({
    storage: instituteImageStorage,
    fileFilter: instituteImageFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
}).single('image');

// ─── Syllabus File Upload ─────────────────────────────────────────────────────
const syllabusStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/syllabus');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `syllabus_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
        cb(null, uniqueName);
    }
});

const syllabusFileFilter = (req, file, cb) => {
    const allowed = /pdf|doc|docx/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    if (ext) cb(null, true);
    else cb(new Error('Only PDF and Word documents are allowed for syllabus'));
};

const uploadSyllabus = multer({
    storage: syllabusStorage,
    fileFilter: syllabusFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
}).single('syllabus');

// ─── Institute Document Upload ────────────────────────────────────────────────
const instituteDocumentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/documents');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `doc_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
        cb(null, uniqueName);
    }
});

const instituteDocumentFileFilter = (req, file, cb) => {
    const allowed = /pdf|doc|docx/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    if (ext) cb(null, true);
    else cb(new Error('Only PDF and Word documents are allowed'));
};

const uploadInstituteDocument = multer({
    storage: instituteDocumentStorage,
    fileFilter: instituteDocumentFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
}).single('document');

module.exports = { uploadInstituteImage, uploadSyllabus, uploadInstituteDocument };
