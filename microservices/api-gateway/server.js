
import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

app.use(createProxyMiddleware({
  target: "http://localhost:5001", // fallback
  changeOrigin: true,
  router: {
    "/api/campaigns": "http://localhost:5002",
    "/api/users": "http://localhost:5001",
    "/api/auth": "http://localhost:5001",
    "/api/donations": "http://localhost:5003",
    "/api/payments": "http://localhost:5003"
  }
}));

app.listen(5000, () => console.log("API Gateway running on port 5000"));

