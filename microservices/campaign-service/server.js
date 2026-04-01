import express from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import { connectDB } from "./config/db.js";
import campaignsRouter from "./routes/campaigns.js";

const app = express();
const PORT = 5002;

app.use(express.json());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cookieSession({
  name: "session",
  keys: [process.env.SESSION_SECRET || "your-secret-key"],
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  secure: false,
  sameSite: "lax",
}));

app.use("/api/campaigns", campaignsRouter);

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log("Service running on port " + PORT);
  });
};
start();
