import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import aiRoutes from "./routes/ai.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://localhost:5173",
  "https://app.nhakhoaphuongsen.com"
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({
    success: true,
    service: process.env.AI_NAME,
    clinic: process.env.AI_CLINIC,
    version: "0.1.0",
    status: "running",
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use("/api/ai", aiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(process.env.PORT, () => {
  console.log("");
  console.log("===================================");
  console.log(`🚀 Dental AI Backend Started`);
  console.log(`Port : ${process.env.PORT}`);
  console.log(`Mode : ${process.env.NODE_ENV}`);
  console.log("===================================");
  console.log("");
});