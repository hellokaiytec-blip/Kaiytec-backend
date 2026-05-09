// src/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for product images
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'kaiytec/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 800, height: 800, crop: 'limit', quality: 'auto:good' },
    ],
  },
});

// Storage for profile / ID photos
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'kaiytec/documents',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    transformation: [
      { quality: 'auto:good' },
    ],
  },
});

const uploadProductImages = multer({
  storage: productStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 4 }, // 5MB per file, max 4
});

const uploadDocuments = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024, files: 2 },
});

module.exports = { cloudinary, uploadProductImages, uploadDocuments };
