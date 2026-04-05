import express from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import { connectDB } from "./config/db.js";
import { connectRabbitMQListener } from "./rabbitmq.js";
import campaignsRouter from "./routes/campaigns.js";

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  console.error("FATAL: SESSION_SECRET is missing in production.");
  process.exit(1);
}

const sessionSecret = process.env.SESSION_SECRET || "dev-secret-key";

const app = express();
const PORT = 5002;

app.use(express.json());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cookieSession({
  name: "session",
  keys: [sessionSecret],
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  secure: false,
  sameSite: "lax",
}));

app.use("/api/campaigns", campaignsRouter);

const start = async () => {
  await connectDB();
  await connectRabbitMQListener();
  app.listen(PORT, () => {
    console.log("Service running on port " + PORT);
  });
};
start();
