const express = require("express");
const multer = require("multer");
const {GridFSBucket} = require("mongodb");
const mongoose = require("mongoose");
const FileMetadata = require("../models/FileMetadata");

const router = express.Router();
const mongoURI = "mongodb://54.196.202.145:27017/Starteryou";
const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let bucket;
conn.once("open", () => {
  bucket = new GridFSBucket(conn.db, {bucketName: "uploads"});
  console.log("GridFS bucket initialized");
});

const storage = multer.memoryStorage();
const upload = multer({storage});

// Route for uploading an image with metadata
router.post("/upload", upload.single("file"), async (req, res) => {
  console.log("Upload request received");
  const {buffer, originalname} = req.file;
  const {title, uploadedBy} = req.body;

  if (!uploadedBy) {
    return res
      .status(400)
      .json({message: 'The "uploadedBy" field is required'});
  }

  const uploadStream = bucket.openUploadStream(originalname);
  uploadStream.end(buffer);

  uploadStream.on("finish", async (file) => {
    try {
      const fileMetadata = new FileMetadata({
        title,
        originalFilename: originalname,
        uploadedBy,
        gridFsFileId: file._id,
      });

      await fileMetadata.save();
      console.log(`File uploaded: ${title}`);
      res
        .status(201)
        .json({file: {_id: file._id, filename: originalname, title}});
    } catch (error) {
      console.error("Error saving metadata:", error);
      res.status(500).json({message: "Error saving file metadata"});
    }
  });

  uploadStream.on("error", (error) => {
    console.error("Error during upload:", error);
    res.status(500).json({message: error.message});
  });
});

// Route for updating an existing image by title
router.put("/update", upload.single("file"), async (req, res) => {
  console.log("Update request received");
  const {buffer, originalname} = req.file;
  const {title} = req.body;

  try {
    const existingFileMetadata = await FileMetadata.findOne({title});
    if (!existingFileMetadata) {
      console.error("File not found for title:", title);
      return res.status(404).json({message: "File not found"});
    }

    const oldFileId = existingFileMetadata.gridFsFileId;

    const uploadStream = bucket.openUploadStream(originalname);
    uploadStream.end(buffer);

    uploadStream.on("finish", async (file) => {
      console.log(
        "New version of file uploaded. Old ID:",
        oldFileId,
        "New ID:",
        file._id
      );

      existingFileMetadata.gridFsFileId = file._id;
      await existingFileMetadata.save();

      if (oldFileId) {
        try {
          await bucket.delete(oldFileId);
          console.log("Old file deleted successfully:", oldFileId);
        } catch (deleteError) {
          console.error("Error deleting old file:", deleteError);
        }
      }

      res
        .status(200)
        .json({file: {_id: file._id, filename: originalname, title}});
    });

    uploadStream.on("error", (error) => {
      console.error("Error during upload:", error);
      res.status(500).json({message: error.message});
    });
  } catch (error) {
    console.error("Error updating image:", error);
    res.status(500).json({message: error.message});
  }
});

// Route to fetch all uploaded files metadata
router.get("/", async (req, res) => {
  console.log("Fetching all files");
  try {
    const files = await FileMetadata.find().select(
      "title originalFilename uploadedBy createdAt"
    );
    console.log("Available files:", files);
    res.status(200).json({files});
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({message: error.message});
  }
});

// Route to get a file by title
router.get("/title/:title", async (req, res) => {
  const {title} = req.params;

  try {
    console.log("Attempting to find file with title:", title);

    const metadata = await FileMetadata.findOne({title});
    console.log("Found metadata:", metadata);

    if (!metadata) {
      console.log("No metadata found for title:", title);
      return res.status(404).json({message: "File not found"});
    }

    console.log("Found gridFsFileId:", metadata.gridFsFileId);
    const readStream = bucket.openDownloadStream(metadata.gridFsFileId);

    readStream.on("error", (error) => {
      console.error("Error in readStream:", error);
      res.status(500).json({message: error.message});
    });

    readStream.pipe(res);
  } catch (error) {
    console.error("Error fetching file by title:", error);
    res.status(500).json({message: error.message});
  }
});

// New route to list all files
router.get("/list", async (req, res) => {
  try {
    const files = await FileMetadata.find().select(
      "title originalFilename uploadedBy createdAt"
    );
    console.log("Available files:", files);
    res.status(200).json({files});
  } catch (error) {
    console.error("Error listing files:", error);
    res.status(500).json({message: error.message});
  }
});

module.exports = router;
