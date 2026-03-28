import express from 'express';
import { connectDB } from './config/db.js';
import campaignRoutes from './routes/campaigns.js';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/campaigns', campaignRoutes);

// Centralized error handler
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({ error: 'Internal Server Error' });
});

connectDB().then(() => {
	app.listen(3002, () => console.log('Campaign Service running on port 3002'));
});