import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import fs from "fs";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connect
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error(err));

// Image schema
const ImageSchema = new mongoose.Schema({
  filename: String,
  uploadedAt: { type: Date, default: Date.now }
});
const Image = mongoose.model("Image", ImageSchema);

// Multer config (store in /uploads)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// Upload endpoint
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const newImage = new Image({ filename: req.file.filename });
    await newImage.save();
    res.json({ message: "✅ Uploaded", filename: req.file.filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List metadata
app.get("/images", async (req, res) => {
  const images = await Image.find().sort({ uploadedAt: -1 });
  res.json(images);
});

// Serve image file directly
app.get("/images/:filename", (req, res) => {
  const filePath = path.join("uploads", req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath));
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

