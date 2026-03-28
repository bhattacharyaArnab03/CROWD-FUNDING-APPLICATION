const express = require('express');
const app = express();
app.use(express.json());
const donationRoutes = require('./routes/donations');
app.use('/donations', donationRoutes);
app.listen(3003, () => console.log('Donation Service running on port 3003'));