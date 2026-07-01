
const express = require('express');
const pageSpeedService = require('../services/pageSpeedService');

const router = express.Router();

// PageSpeed API
router.get('/', async (req, res) => {
  try {
    let targetUrl = req.query.url;
    if (!targetUrl || targetUrl.includes("localhost")) {
      targetUrl = process.env.TARGET_URL;
    }
    const data = await pageSpeedService.fetchPageSpeedMetrics(targetUrl);
    res.json(data);
  } catch (err) {
    const status = err.response?.status || 500;
    const apiErrorMessage =
      err.response?.data?.error?.message ||
      err.response?.data?.message ||
      err.message ||
      'Failed to fetch PageSpeed metrics';

    console.error('Error in /api/pagespeed:', {
      status,
      message: apiErrorMessage,
      raw: err.response?.data || err.message
    });

    res.status(status).json({
      message: apiErrorMessage,
      details: err.response?.data || null
    });
  }
});

module.exports = router;
