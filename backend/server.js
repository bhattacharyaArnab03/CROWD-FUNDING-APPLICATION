import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import usersRouter from "./routes/users.js";
import campaignsRouter from "./routes/campaigns.js";
import donationsRouter from "./routes/donations.js";
import paymentsRouter from "./routes/payments.js";
import authRouter from "./routes/auth.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));

app.get("/api", (req, res) => {
  res.json({ message: "Crowdfunding backend API is running." });
});

app.use("/api/users", usersRouter);
app.use("/api/auth", authRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/donations", donationsRouter);
app.use("/api/payments", paymentsRouter);

app.use((req, res) => {
  res.status(404).json({ message: "API route not found." });
});

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
};

start();
