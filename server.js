import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI; // Set in Render dashboard

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

const imageSchema = new mongoose.Schema({
  filename: String,
  data: String,
  contentType: String,
  uploadedAt: { type: Date, default: Date.now },
});
const Image = mongoose.model("Image", imageSchema);

// ✅ POST /ping (doorbell trigger)
app.post("/ping", (req, res) => {
  io.emit("doorbell", { message: "Someone is at the door!" });
  res.json({ success: true });
});

// ✅ POST /upload (base64 image)
app.post("/upload", async (req, res) => {
  try {
    const { filename, data, contentType } = req.body;
    if (!filename || !data)
      return res.status(400).json({ error: "Missing fields" });

    const img = new Image({ filename, data, contentType });
    await img.save();

    io.emit("new_image", {
      _id: img._id,
      filename: img.filename,
      uploadedAt: img.uploadedAt,
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ✅ GET /images (metadata)
app.get("/images", async (req, res) => {
  const imgs = await Image.find({}, { data: 0 }).sort({ uploadedAt: -1 });
  res.json(imgs);
});

// ✅ GET /images/id/:id (full base64 image)
app.get("/images/id/:id", async (req, res) => {
  const img = await Image.findById(req.params.id);
  if (!img) return res.status(404).json({ error: "Not found" });
  res.json(img);
});

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);
});

server.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);

