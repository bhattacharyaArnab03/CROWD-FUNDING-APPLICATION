import express from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import { connectDB } from "./config/db.js";
import { connectRabbitMQ } from "./rabbitmq.js";
import donationsRouter from "./routes/donations.js";
import paymentsRouter from "./routes/payments.js";

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  console.error("FATAL: SESSION_SECRET is missing in production.");
  process.exit(1);
}

const sessionSecret = process.env.SESSION_SECRET || "dev-secret-key";

const app = express();
const PORT = 5003;

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

app.use("/api/donations", donationsRouter);
app.use("/api/payments", paymentsRouter);

const start = async () => {
  await connectDB();
  await connectRabbitMQ();
  app.listen(PORT, () => {
    console.log("Service running on port " + PORT);
  });
};
start();
