
const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const pageSpeedRoutes = require('./routes/pagespeed');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static assets
app.use(express.static(path.join(__dirname, '../public')));

// PageSpeed API
app.use('/api/pagespeed', pageSpeedRoutes);

// Adobe Analytics (Page Insights)
app.use('/api/analytics', analyticsRoutes);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});




