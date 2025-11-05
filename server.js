import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: "10mb" })); // allow large base64 payloads

// --- MongoDB Connection ---
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err));

// --- Schema ---
const ImageSchema = new mongoose.Schema({
  filename: String,
  contentType: String,
  data: Buffer,
  uploadedAt: { type: Date, default: Date.now },
});

const Image = mongoose.model("Image", ImageSchema);

// --- Multer (in-memory storage) ---
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- Routes ---

// health check
app.get("/", (req, res) => res.send("📸 Doorbell API (MongoDB-storage) is running!"));

// upload image (from ESP or frontend)
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const newImage = new Image({
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      data: req.file.buffer,
    });
    await newImage.save();
    res.json({ success: true, message: "Image stored in MongoDB", id: newImage._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Upload failed" });
  }
});

// list all images (metadata + base64)
app.get("/images", async (req, res) => {
  try {
    const images = await Image.find().sort({ uploadedAt: -1 });
    const formatted = images.map((img) => ({
      id: img._id,
      filename: img.filename,
      uploadedAt: img.uploadedAt,
      base64: `data:${img.contentType};base64,${img.data.toString("base64")}`,
    }));
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch images" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

