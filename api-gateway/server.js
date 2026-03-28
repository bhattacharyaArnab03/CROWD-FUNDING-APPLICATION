const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

app.use('/users', createProxyMiddleware({ target: 'http://localhost:3001', changeOrigin: true }));
app.use('/campaigns', createProxyMiddleware({ target: 'http://localhost:3002', changeOrigin: true }));
app.use('/donations', createProxyMiddleware({ target: 'http://localhost:3003', changeOrigin: true }));
app.use('/payments', createProxyMiddleware({ target: 'http://localhost:3004', changeOrigin: true }));

app.listen(3000, () => console.log('API Gateway running on port 3000'));