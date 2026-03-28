import express from 'express';
import { connectDB } from './config/db.js';
import userRoutes from './routes/users.js';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/users', userRoutes);

// Centralized error handler
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({ error: 'Internal Server Error' });
});

connectDB().then(() => {
	app.listen(3001, () => console.log('User Service running on port 3001'));
});