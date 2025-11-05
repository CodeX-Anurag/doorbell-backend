import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// For ES modules: resolve __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB setup
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err));

// Mongoose model
const ImageSchema = new mongoose.Schema({
  filename: String,
  path: String,
  uploadedAt: { type: Date, default: Date.now },
});
const Image = mongoose.model("Image", ImageSchema);

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Routes
app.get("/", (req, res) => res.send("📸 Doorbell API is live."));

app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const img = new Image({
      filename: req.file.filename,
      path: `/uploads/${req.file.filename}`,
    });
    await img.save();

    // Notify all connected clients
    io.emit("new_image", { image: img });

    res.json({ success: true, image: img });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Upload failed." });
  }
});

app.get("/images", async (req, res) => {
  const images = await Image.find().sort({ uploadedAt: -1 });
  res.json(images);
});

// Doorbell ping route (ESP or test)
app.post("/ping", (req, res) => {
  console.log("🔔 Doorbell pressed!");
  io.emit("doorbell", { message: "Someone is at the door!" });
  res.json({ success: true, message: "Doorbell notification sent." });
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("👤 Client connected:", socket.id);
  socket.on("disconnect", () => console.log("❌ Client disconnected:", socket.id));
});

// Start server
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

