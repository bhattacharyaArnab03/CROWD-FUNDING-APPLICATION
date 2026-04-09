

import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));



// Enhanced logging middleware for all incoming API requests
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const elapsed = Date.now() - start;
    console.log(`[API Gateway] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${elapsed} ms)`);
  });
  next();
});

// Helper to log proxy target
function logProxyTarget(proxyReq, req, res, target) {
  console.log(`[API Gateway] Proxying ${req.method} ${req.originalUrl} to ${target}`);
}

app.use(createProxyMiddleware({
  target: "http://localhost:5001", // fallback
  changeOrigin: true,
  router: {
    "/api/campaigns": "http://localhost:5002",
    "/api/users": "http://localhost:5001",
    "/api/auth": "http://localhost:5001",
    "/api/donations": "http://localhost:5003",
    "/api/payments": "http://localhost:5003"
  },
  onProxyReq: logProxyTarget,
  onError: (err, req, res) => {
    console.error(`[API Gateway] Proxy error for ${req.method} ${req.originalUrl}:`, err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'Proxy error', details: err.message }));
  }
}));

app.listen(5000, () => console.log("API Gateway running on port 5000"));

