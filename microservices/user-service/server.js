const express = require('express');
const app = express();
app.use(express.json());
const userRoutes = require('./routes/users');
app.use('/users', userRoutes);
app.listen(3001, () => console.log('User Service running on port 3001'));