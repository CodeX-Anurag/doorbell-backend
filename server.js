import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads")); // to serve images statically

// --- MongoDB setup ---
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// --- Schema ---
const ImageSchema = new mongoose.Schema({
  filename: String,
  filepath: String,
  timestamp: { type: Date, default: Date.now },
});

const Image = mongoose.model("Image", ImageSchema);

// --- Multer setup ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// --- Routes ---

// 📤 Upload image
app.post("/upload", upload.single("image"), async (req, res) => {
  const image = new Image({
    filename: req.file.originalname,
    filepath: `/uploads/${req.file.filename}`,
  });
  await image.save();

  io.emit("new_image", image); // notify clients
  res.json({ message: "Image uploaded", image });
});

// 📥 Get image list (metadata only)
app.get("/images", async (req, res) => {
  const images = await Image.find({}, "filename filepath timestamp").sort({ timestamp: -1 });
  res.json(images);
});

// 📸 Get single image file
app.get("/image/:id", async (req, res) => {
  const img = await Image.findById(req.params.id);
  if (!img) return res.status(404).send("Image not found");
  res.sendFile(path.resolve(img.filepath));
});

// 🔔 Doorbell trigger (e.g. ESP32 ping)
app.post("/doorbell", (req, res) => {
  io.emit("doorbell_pressed");
  res.json({ message: "Doorbell pressed!" });
});

// --- WebSocket connection ---
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

