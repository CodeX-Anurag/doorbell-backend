import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// --- MongoDB Connection ---
const mongoUri = process.env.MONGO_URI;
mongoose
  .connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// --- Mongoose Schema ---
const imageSchema = new mongoose.Schema({
  deviceId: String,
  timestamp: { type: Date, default: Date.now },
  image: Buffer, // store image as binary
  contentType: String,
});

const Image = mongoose.model("Image", imageSchema);

// --- Multer Setup for image upload ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- ROUTES ---

// 1️⃣ Health check
app.get("/", (req, res) => {
  res.send("Doorbell backend running!");
});

// 2️⃣ Ping for keep-alive
app.get("/ping", (req, res) => {
  res.send("pong");
});

// 3️⃣ Upload image (ESP32 or manual POST)
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image provided" });

    const newImage = new Image({
      deviceId: req.body.deviceId || "ESP32",
      image: req.file.buffer,
      contentType: req.file.mimetype,
    });

    await newImage.save();
    console.log("📸 New image saved:", newImage._id);

    res.json({
      message: "Image uploaded successfully",
      id: newImage._id,
      timestamp: newImage.timestamp,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// 4️⃣ Get all images (returns base64 data)
app.get("/images", async (req, res) => {
  try {
    const images = await Image.find().sort({ timestamp: -1 });
    const formatted = images.map((img) => ({
      _id: img._id,
      deviceId: img.deviceId,
      timestamp: img.timestamp,
      imageBase64: `data:${img.contentType};base64,${img.image.toString("base64")}`,
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// 5️⃣ Clear all images (for debug)
app.delete("/clear", async (req, res) => {
  await Image.deleteMany({});
  res.send("All images deleted.");
});

// --- Server Start ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

