// backend/config/initDB.js
const mongoose = require("mongoose");
const {GridFSBucket} = require("mongodb");

async function initializeDatabase() {
  try {
    // Connect to MongoDB
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://54.196.202.145:27017/starteryou";
    const connection = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Initialize GridFS bucket
    const db = connection.connection.db;
    const bucket = new GridFSBucket(db, {
      bucketName: "uploads",
    });

    console.log("Database initialized successfully");
    return {connection, bucket};
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

module.exports = initializeDatabase;
