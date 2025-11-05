import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
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

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: "10mb" })); // for base64 JSON uploads

// --- MongoDB Setup ---
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err));

// --- Schema ---
const ImageSchema = new mongoose.Schema({
  data: String, // base64 image
  filename: String,
  uploadedAt: { type: Date, default: Date.now },
});

const Image = mongoose.model("Image", ImageSchema);

// --- Multer setup for form uploads (optional for testing) ---
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- Routes ---
app.get("/", (req, res) => res.send("📸 Doorbell API is running."));

// ✅ Upload endpoint (via base64 or file)
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    let imgData;

    if (req.file) {
      // if uploaded as file
      imgData = req.file.buffer.toString("base64");
    } else {
      // if uploaded via JSON
      imgData = req.body.image;
    }

    const img = new Image({
      filename: req.body.filename || `doorbell_${Date.now()}.png`,
      data: imgData,
    });

    await img.save();

    // Notify all connected clients
    io.emit("new_image", {
      id: img._id,
      filename: img.filename,
      uploadedAt: img.uploadedAt,
    });

    res.json({ success: true, id: img._id });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, error: "Upload failed." });
  }
});

// ✅ Lightweight list (no base64)
app.get("/images", async (req, res) => {
  const images = await Image.find({}, { data: 0 }).sort({ uploadedAt: -1 });
  res.json(images);
});

// ✅ Fetch one image (returns base64)
app.get("/images/:id", async (req, res) => {
  try {
    const img = await Image.findById(req.params.id);
    if (!img) return res.status(404).json({ error: "Not found" });
    res.json({ filename: img.filename, data: img.data });
  } catch {
    res.status(400).json({ error: "Invalid ID" });
  }
});

// --- Socket.IO connection ---
io.on("connection", (socket) => {
  console.log("🔔 Client connected:", socket.id);
  socket.on("disconnect", () => console.log("❌ Client disconnected:", socket.id));
});

// --- Start ---
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

