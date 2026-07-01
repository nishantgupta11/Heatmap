
const express = require('express');
const analyticsService = require('../services/analyticsService');

const router = express.Router();

// Adobe Analytics (Page Insights)
router.get('/page-insights', async (req, res) => {
  try {
    let { start, end, isCampaignPdf, isCampaign, pageUrl } = req.query;

    // Fallback when testing locally or if pageUrl is missing
    if (!pageUrl || pageUrl.includes('localhost')) {
      pageUrl = process.env.TARGET_URL;
    }

    console.log('Page Insights date range:', start, '→', end, 'URL:', pageUrl);

    const data = await analyticsService.fetchPageInsightsMetrics({
      start,
      end,
      isCampaignPdf,
      isCampaign,
      pageUrl
    });
    res.json(data);
  } catch (err) {
    const status = err.response?.status || 500;
    const apiErrorMessage =
      err.response?.data?.error?.message ||
      err.response?.data?.message ||
      err.message ||
      'Failed to fetch Analytics metrics';

    console.error('Error in /api/analytics/page-insights:', {
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






