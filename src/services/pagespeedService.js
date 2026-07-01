

const axios = require('axios');
 
const API_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
 
const GOOGLE_API_KEY = process.env.GOOGLE_PSI_API_KEY;
const TARGET_URL = process.env.TARGET_URL;
 
if (!GOOGLE_API_KEY) {
  console.warn('WARNING: GOOGLE_PSI_API_KEY is not set in .env');
}
 
if (!TARGET_URL) {
  console.warn('WARNING: TARGET_URL is not set in .env');
}
 

async function fetchStrategy(strategy, targetUrl) {
  if (!GOOGLE_API_KEY || !targetUrl) {
    throw new Error('GOOGLE_PSI_API_KEY or TARGET_URL not configured');
  }
 
  const url = new URL(API_ENDPOINT);
  url.searchParams.set('url', targetUrl);
  url.searchParams.set('key', GOOGLE_API_KEY);
  url.searchParams.append('category', 'performance');
  url.searchParams.append('category', 'accessibility');
  url.searchParams.set('strategy', strategy);
 
  const { data } = await axios.get(url.toString());
 
  if (data.error) {
    console.error(`PageSpeed API error (${strategy}):`, data.error);
    throw new Error(`PageSpeed API error (${strategy}): ${data.error.message}`);
  }
 
  return data;
}

function mapLighthouseToMetrics(lighthouse, loadingExperience) { 
 if (!lighthouse || !lighthouse.categories) { 
    console.error('Unexpected PageSpeed lighthouse object:', lighthouse); 
    throw new Error('Unexpected PageSpeed response: missing lighthouse categories'); 
  } 
  
  const audits = lighthouse.audits; 
 
  
  const getNumeric = (id) => { 
    return audits[id] && audits[id].numericValue !== undefined ? audits[id].numericValue : 0;
  };  
  const lighthouseInp = getNumeric('interaction-to-next-paint');
  const fieldInp = loadingExperience?.metrics?.INTERACTION_TO_NEXT_PAINT?.percentile || 0; 
  const inp = lighthouseInp > 0 ? lighthouseInp : fieldInp; 

  // Accessibility parameters

  const accessibilityAudits = {}; 
  const impactfulMetrics = [
    "color-contrast",
    "image-alt",
    "label",
    "focusable-controls",
    "duplicate-id",
    "aria-allowed-attr",
    "aria-label",
  ];
  const failedAudits = lighthouse.categories.accessibility.auditRefs
    .map((ref) => lighthouse.audits[ref.id])
    .filter((audit) => audit.score === 0);
  for (const audit of failedAudits) {
    if (impactfulMetrics.includes(audit.id)) {
      accessibilityAudits[audit.id] = {
        title: audit.title,
        description: audit.description,
        score: audit.score,
        details: audit.details || null,
      };
    }
  }
  if (Object.keys(accessibilityAudits).length < 4) {
    for (const audit of failedAudits) {
      if (!accessibilityAudits[audit.id]) {
        accessibilityAudits[audit.id] = {
          title: audit.title,
          description: audit.description,
          score: audit.score,
          details: audit.details || null,
        };
      }
      if (Object.keys(accessibilityAudits).length >= 4) break;
    }
  }
  
  return { 
    // Top-level Scores
    'Performance Score': Math.round((lighthouse.categories.performance?.score || 0) * 100),
    'Accessibility Score': Math.round((lighthouse.categories.accessibility?.score || 0) * 100),
    'accessibility_audits': accessibilityAudits,
   
    'fcp': getNumeric('first-contentful-paint'),
    'lcp': getNumeric('largest-contentful-paint'),
    'speedIndex': getNumeric('speed-index'),
    'inp': inp,
    'cls': getNumeric('cumulative-layout-shift'),
    'tbt': getNumeric('total-blocking-time'),
    'interactive': getNumeric('interactive')
  }; 
}
 

async function fetchPageSpeedMetrics(targetUrl) {
  const [desktopJson, mobileJson] = await Promise.all([
    fetchStrategy('desktop', targetUrl),
    fetchStrategy('mobile', targetUrl)
  ]);
 
  if (!desktopJson.lighthouseResult || !mobileJson.lighthouseResult) {
    console.error('PageSpeed response missing lighthouseResult:', {
      desktop: desktopJson,
      mobile: mobileJson
    });
    throw new Error('Unexpected PageSpeed response: missing lighthouseResult');
  }
 
  return {
    desktop: mapLighthouseToMetrics(desktopJson.lighthouseResult, desktopJson.loadingExperience),
    mobile: mapLighthouseToMetrics(mobileJson.lighthouseResult, mobileJson.loadingExperience)
  };
}
 
module.exports = {
  fetchPageSpeedMetrics
};
 