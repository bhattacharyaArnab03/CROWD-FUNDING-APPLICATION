import express from 'express';
import { connectDB } from './config/db.js';
import donationRoutes from './routes/donations.js';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/donations', donationRoutes);

// Centralized error handler
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({ error: 'Internal Server Error' });
});

connectDB().then(() => {
	app.listen(3003, () => console.log('Donation Service running on port 3003'));
});