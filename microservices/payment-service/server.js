const express = require('express');
const app = express();
app.use(express.json());
const paymentRoutes = require('./routes/payments');
app.use('/payments', paymentRoutes);
app.listen(3004, () => console.log('Payment Service running on port 3004'));