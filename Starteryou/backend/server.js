// server.js
const express = require("express");
const initializeDatabase = require("./config/initDB");
const fileRoutes = require("./routes/fileRoutes");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

// Set mongoose options to suppress the deprecation warning
mongoose.set("strictQuery", false);

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database and get bucket
    const {bucket} = await initializeDatabase();

    // Make bucket available to routes
    app.locals.bucket = bucket;

    // Use CORS middleware to allow all origins
    app.use(cors());

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({extended: true}));

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        mongoConnection:
          mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        gridFSBucket: app.locals.bucket ? "initialized" : "not initialized",
      });
    });

    // Define your file routes
    app.use("/api/files", fileRoutes);

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({message: "Something went wrong!"});
    });

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle process termination
process.on("SIGINT", () => {
  mongoose.connection.close(() => {
    console.log("MongoDB connection closed through app termination");
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = app;
