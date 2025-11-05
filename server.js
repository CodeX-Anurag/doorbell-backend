import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

// Schema
const ImageSchema = new mongoose.Schema({
  imageData: String,
  timestamp: { type: Date, default: Date.now }
});

const Image = mongoose.model("Image", ImageSchema);

// Routes
app.post("/upload", async (req, res) => {
  const { imageData } = req.body;
  const img = new Image({ imageData });
  await img.save();
  res.send({ success: true });
});

app.get("/images", async (req, res) => {
  const imgs = await Image.find().sort({ timestamp: -1 });
  res.send(imgs);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

