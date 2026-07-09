const DriveItem = require('../models/DriveItem');
const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require('fs');

// Helper function to resolve/create nested folders for a relative path
const resolveNestedFolders = async (relativePath, rootParentId, userId, institute) => {
    if (!relativePath) return rootParentId;
    
    // Split and filter empty parts
    const parts = relativePath.split('/').filter(Boolean);
    if (parts.length <= 1) {
        // No folders, or only file name
        return rootParentId;
    }
    
    // The folders are all parts except the last one (which is the file name)
    const folderNames = parts.slice(0, -1);
    
    let currentParentId = rootParentId;
    
    for (const folderName of folderNames) {
        // Check if folder exists
        let folder = await DriveItem.findOne({
            name: folderName,
            type: 'folder',
            parentId: currentParentId,
            institute: institute,
            isDeleted: false
        });
        
        if (!folder) {
            // Create the folder
            folder = await DriveItem.create({
                name: folderName,
                type: 'folder',
                parentId: currentParentId,
                uploadedBy: userId,
                institute: institute
            });
        }
        currentParentId = folder._id;
    }
    
    return currentParentId;
};

// @desc    Get drive items (files & folders) in a parent folder
// @route   GET /api/drive
// @access  Private (Admin, Teacher, etc.)
const getDriveItems = asyncHandler(async (req, res) => {
    const parentId = req.query.parentId === 'null' || !req.query.parentId ? null : req.query.parentId;
    const institute = req.user.institute?._id || req.user.institute || '';

    // Find all files and folders
    const items = await DriveItem.find({
        parentId,
        institute,
        isDeleted: false
    })
    .populate('uploadedBy', 'name email role')
    .sort({ type: 1, name: 1 }); // Folders first, then alphabetical

    // Also get breadcrumbs to make navigation easy
    const breadcrumbs = [];
    let currentId = parentId;
    while (currentId) {
        const parentFolder = await DriveItem.findOne({ _id: currentId, type: 'folder', isDeleted: false });
        if (parentFolder) {
            breadcrumbs.unshift({
                _id: parentFolder._id,
                name: parentFolder.name
            });
            currentId = parentFolder.parentId;
        } else {
            break;
        }
    }

    res.json({ items, breadcrumbs });
});

// @desc    Create a new folder
// @route   POST /api/drive/folder
// @access  Private
const createFolder = asyncHandler(async (req, res) => {
    const { name, parentId } = req.body;
    const userId = req.user._id;
    const institute = req.user.institute?._id || req.user.institute || '';

    if (!name || !name.trim()) {
        res.status(400);
        throw new Error('Folder name is required');
    }

    const resolvedParentId = parentId === 'null' || !parentId ? null : parentId;

    // Check if folder name already exists in this directory
    const existing = await DriveItem.findOne({
        name: name.trim(),
        type: 'folder',
        parentId: resolvedParentId,
        institute,
        isDeleted: false
    });

    if (existing) {
        res.status(400);
        throw new Error('A folder with this name already exists');
    }

    const folder = await DriveItem.create({
        name: name.trim(),
        type: 'folder',
        parentId: resolvedParentId,
        uploadedBy: userId,
        institute
    });

    res.status(201).json(folder);
});

// @desc    Upload a file (or files nested under folder paths)
// @route   POST /api/drive/upload
// @access  Private
const uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
    }

    const { parentId, relativePath } = req.body;
    const userId = req.user._id;
    const institute = req.user.institute?._id || req.user.institute || '';
    const resolvedParentId = parentId === 'null' || !parentId ? null : parentId;

    // Resolve folder hierarchy if relativePath is present
    let finalParentId = resolvedParentId;
    if (relativePath) {
        finalParentId = await resolveNestedFolders(relativePath, resolvedParentId, userId, institute);
    }

    // Save drive item (file)
    const fileItem = await DriveItem.create({
        name: req.file.originalname,
        type: 'file',
        parentId: finalParentId,
        fileUrl: `/uploads/attachments/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: userId,
        institute
    });

    res.status(201).json(fileItem);
});

// @desc    Delete a drive item (file or folder and its children)
// @route   DELETE /api/drive/:id
// @access  Private
const deleteDriveItem = asyncHandler(async (req, res) => {
    const item = await DriveItem.findById(req.params.id);

    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    // Recursive helper to mark folder contents as deleted
    const markDeletedRecursive = async (itemId) => {
        await DriveItem.findByIdAndUpdate(itemId, { isDeleted: true });
        
        const children = await DriveItem.find({ parentId: itemId, isDeleted: false });
        for (const child of children) {
            await markDeletedRecursive(child._id);
        }
    };

    await markDeletedRecursive(item._id);

    res.json({ message: 'Item deleted successfully' });
});

module.exports = {
    getDriveItems,
    createFolder,
    uploadFile,
    deleteDriveItem
};
