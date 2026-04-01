import express from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import { connectDB } from "./config/db.js";
import usersRouter from "./routes/users.js";
import authRouter from "./routes/auth.js";

const app = express();
const PORT = 5001;

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

app.use("/api/users", usersRouter);
app.use("/api/auth", authRouter);

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log("Service running on port " + PORT);
  });
};
start();
