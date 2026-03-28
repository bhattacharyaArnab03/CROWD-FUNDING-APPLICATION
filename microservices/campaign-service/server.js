const express = require('express');
const app = express();
app.use(express.json());
const campaignRoutes = require('./routes/campaigns');
app.use('/campaigns', campaignRoutes);
app.listen(3002, () => console.log('Campaign Service running on port 3002'));