const axios = require('axios');
const ADOBE_ENDPOINT = 'https://analytics.adobe.io/api/asianp1/reports';
const IMS_TOKEN_URL = 'https://ims-na1.adobelogin.com/ims/token/v3';
const ADOBE_TIMEOUT = Number(process.env.ADOBE_TIMEOUT || 20000); // 20s default
const ADOBE_CLIENT_ID = process.env.ADOBE_CLIENT_ID;
const ADOBE_CLIENT_SECRET = process.env.ADOBE_CLIENT_SECRET;
const ADOBE_SCOPE =
  process.env.ADOBE_SCOPE ||
  'openid,AdobeID,additional_info.projectedProductContext';

const ADOBE_API_KEY = process.env.ADOBE_API_KEY || ADOBE_CLIENT_ID;
const ADOBE_COMPANY_ID = process.env.ADOBE_COMPANY_ID;
const ADOBE_RSID = process.env.ADOBE_RSID;
const ADOBE_ITEM_ID = process.env.ADOBE_ITEM_ID;
const ADOBE_EVAR_ID = process.env.ADOBE_EVAR_ID;

let adobeAccessToken = null;
let adobeTokenExpiresAt = 0;

const pageAnalyticsKeys = [
  'Page Views',
  'Visitors',
  'Visits',
  'Entries',
  'Exits',
  'Bounces'
];

function mapArrayToMetrics(keys, valuesArray) {
  const result = {};
  keys.forEach((key, index) => {
    if (valuesArray[index] !== undefined) {
      result[key] = valuesArray[index];
    }
  });
  return result;
}

// 0–23 hour index -> "1:00 AM" / "5:00 PM"
function formatPeakHourLabel(hourIndex) {
  const n = Number(hourIndex);
  if (!Number.isFinite(n) || n < 0 || n > 23) return null;

  const suffix = n >= 12 ? 'PM' : 'AM';
  const twelveHour = ((n + 11) % 12) + 1; // 0->12, 13->1, etc.
  return `${twelveHour}:00 ${suffix}`;
}

async function getAdobeAccessToken() {
  const now = Date.now();

  if (adobeAccessToken && now < adobeTokenExpiresAt - 60_000) {
    return adobeAccessToken;
  }
  if (!ADOBE_CLIENT_ID || !ADOBE_CLIENT_SECRET) {
    throw new Error(
      'Adobe client credentials are not configured (ADOBE_CLIENT_ID / ADOBE_CLIENT_SECRET)'
    );
  }
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: ADOBE_CLIENT_ID,
    client_secret: ADOBE_CLIENT_SECRET,
    scope: ADOBE_SCOPE
  });
  try {
    const { data } = await axios.post(IMS_TOKEN_URL, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 8000
    });
    if (!data.access_token) {
      console.error('Adobe IMS token response missing access_token:', data);
      throw new Error('Failed to obtain Adobe access token');
    }
    adobeAccessToken = data.access_token;

    const expiresInSec =
      typeof data.expires_in === 'number' ? data.expires_in : 3600;
    adobeTokenExpiresAt = now + expiresInSec * 1000;
    return adobeAccessToken;
  } catch (err) {
    console.error(
      'Error fetching Adobe access token:',
      err.response?.data || err.message
    );
    throw new Error('Failed to fetch Adobe access token');
  }
}

function buildAdobeDateRange(start, end) {
  if (!start || !end) {
    // fallback for testing
    return '2025-11-01T00:00:00.000/2025-11-13T23:59:59.999';
  }
  return `${start}T00:00:00.000/${end}T23:59:59.999`;
}

async function fetchPageInsightsMetrics(options = {}) {
  if (!ADOBE_API_KEY || !ADOBE_COMPANY_ID || !ADOBE_RSID) {
    throw new Error(
      'Adobe env vars are not fully configured (ADOBE_API_KEY / ADOBE_COMPANY_ID / ADOBE_RSID)'
    );
  }

  const { start, end, isCampaignPdf, isCampaign, pageUrl } = options;

  if (!pageUrl) {
    throw new Error('pageUrl is required for Adobe Analytics query');
  }

  const adobeDateRange = buildAdobeDateRange(start, end);
  const safeClauseUrl = pageUrl.replace(/'/g, "\\'");

  const token = await getAdobeAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'x-api-key': ADOBE_API_KEY,
    'x-proxy-global-company-id': ADOBE_COMPANY_ID,
    'Content-Type': 'application/json'
  };

  const mainBody = {
    rsid: ADOBE_RSID,
    globalFilters: [
      {
        type: 'dateRange',
        dateRange: adobeDateRange
      }
    ],
    metricContainer: {
      metrics: [
        { id: 'metrics/pageviews' },        // 0
        { id: 'metrics/visitors' },         // 1
        { id: 'metrics/visits' },           // 2
        { id: 'metrics/entries' },          // 3
        { id: 'metrics/exits' },            // 4
        { id: 'metrics/bounces' },          // 5
        { id: 'metrics/event9' },           // 6  <-- conversions
        { id: 'metrics/timespentvisit' },   // 7  <-- time per visit (sec)
        { id: 'metrics/timespentvisitor' }, // 8  <-- time per visitor (sec)
        {
          id: 'metrics/visits',
          filters: ['seg_mobile_phone_id'],
          name: 'Mobile Visits (Mobile Phone)'
        }, // 9
        {
          id: 'metrics/visits',
          filters: ['seg_nonmobile_id'],
          name: 'Non-Mobile Visits (Not Mobile Phone)'
        }, // 10
          { id: 'metrics/event8' },
          { id: 'metrics/event132' },
        { id: 'metrics/event143', 'filters': ['FAQs_click'], 'name': 'Overall FAQs Click' },
        { id: 'metrics/event136', 'name': 'Campaign FAQ Click'  },
        { id: 'metrics/event134', 'name': 'Download Click'  },
        { id: 'metrics/event20', 'name': 'Video played'  },      
      ],
      metricFilters: [
        {
          id: 'seg_mobile_phone_id',
          type: 'segment',
          segmentId:
            process.env.AD_MOBILE_SEGMENT_ID ||
            's200000889_69660e058d4296479e9be08d'
        },
        {
          id: 'seg_nonmobile_id',
          type: 'segment',
          segmentId:
            process.env.AD_NON_MOBILE_SEGMENT_ID ||
            's200000889_69660e1ea6005a2f7804f32b'
        },
        {
          "id": "FAQs_click",
          "type": "segment",
          "segmentId": "s200000889_697327318864ef5c3c4f79f7"   
        }
      ]
    },
    dimension: ADOBE_EVAR_ID,
    settings: {
      limit: 10,
      page: 0
    },
    search: {
      clause: isCampaign === "false" ? `(MATCH '${safeClauseUrl}')` : `(CONTAINS '${safeClauseUrl}')`
    }
  };

  let baseMetricsObj = {};
  let mobileVisits = 0;
  let nonMobileVisits = 0;
  let mobileVisitPct = 0;
  let nonMobileVisitPct = 0;

  try {
    console.log(">> ADOBE_ENDPOINT", ADOBE_ENDPOINT);
    const { data } = await axios.post(ADOBE_ENDPOINT, mainBody, {
      headers,
      timeout: ADOBE_TIMEOUT
    });

    const totalsArray = data.summaryData?.totals || [];
    const filteredTotals = data.summaryData?.filteredTotals || [];
    const sourceArray =
      filteredTotals && filteredTotals.length ? filteredTotals : totalsArray;

    if (!sourceArray || !sourceArray.length) {
      console.error(
        'Adobe Analytics summaryData arrays are empty:',
        data.summaryData
      );
      return { pageAnalyticsMetrics: {} };
    }

    // Base page metrics (page views, visitors, visits, entries, exits, bounces)
    baseMetricsObj = mapArrayToMetrics(pageAnalyticsKeys, sourceArray);

    const visits = Number(sourceArray[2]) || 0;  // index 2 = visits
    const bounces = Number(sourceArray[5]) || 0; // index 5 = bounces
    const event9 = Number(sourceArray[6]) || 0;  // index 6 = event9
    const timeSpentVisit = Number(sourceArray[7]) || 0;
    const timeSpentVisitor = Number(sourceArray[8]) || 0;

    mobileVisits = Number(sourceArray[9]) || 0;
    nonMobileVisits = Number(sourceArray[10]) || 0;

    // NEW: Form Start (event8 at index 11)
    const event8 = Number(sourceArray[11]) || 0;
    const formStartCount = event8;

    const bounceRate = visits > 0 ? (bounces / visits) * 100 : 0;
    const conversionRate = visits > 0 ? (event9 / visits) * 100 : 0;
    const avgTimePerVisitSeconds = timeSpentVisitor || 0;

    mobileVisitPct = visits > 0 ? (mobileVisits / visits) * 100 : 0;
    nonMobileVisitPct = visits > 0 ? (nonMobileVisits / visits) * 100 : 0;

    const event132 = Number(sourceArray[12]) || 0
    const faqClicked = Number(sourceArray[13]) || 0
    const campaignFaqClicked = Number(sourceArray[14]) || 0
    const downloadClick = Number(sourceArray[15]) || 0
    const videoPlayed = Number(sourceArray[16]) || 0

    baseMetricsObj = {
      ...baseMetricsObj,
      bounceRate,
      conversionRate,
      avgTimePerVisitSeconds,
      event9,              // existing field
      mobileVisits,
      nonMobileVisits,
      mobileVisitPct,
      nonMobileVisitPct,
      event8,
      // NEW field for frontend
      formStartCount,
      event132,
      faqClicked,
      campaignFaqClicked,
      downloadClick,
      videoPlayed,
    };
  } catch (err) {
    console.error(
      'Error calling Adobe Analytics Reports API (main metrics):',
      err.response?.data || err.message
    );
    throw err;
  }

 //peak hour
  let peakTrafficHourLabel = null;

  try {
    const peakBody = {
      rsid: ADOBE_RSID,
      globalFilters: [
        {
          type: 'dateRange',
          dateRange: adobeDateRange
        }
      ],
      metricContainer: {
        metrics: [{ id: 'metrics/visits' }]
      },
      dimension: 'variables/timeparthourofday',
      settings: {
        limit: 1,
        page: 0
      },
      sort: [{ metric: 'metrics/visits', order: 'desc' }]
    };

    const { data: peakData } = await axios.post(ADOBE_ENDPOINT, peakBody, {
      headers,
      timeout: ADOBE_TIMEOUT
    });

    const firstRow = peakData.rows && peakData.rows[0];
    if (firstRow) {
      
      const itemIdNum =
        firstRow.itemId != null ? Number(firstRow.itemId) : NaN;
      const labelFromIndex = Number.isFinite(itemIdNum)
        ? formatPeakHourLabel(itemIdNum)
        : null;

      const labelFromValue =
        typeof firstRow.value === 'string' && firstRow.value.trim()
          ? firstRow.value.trim()
          : null;

     
      peakTrafficHourLabel = labelFromIndex || labelFromValue || null;
    } else {
      console.warn('Peak hour: no rows returned', peakData);
    }
  } catch (err) {
    console.error(
      'Error calling Adobe Analytics Reports API (peak hour):',
      err.response?.data || err.message
    );
   
  }

  //PDF Downloaad report

  let pdfData = [];
  if(isCampaignPdf === "true") {
    

    try {
      const pdfdownloadBody = {
        rsid: ADOBE_RSID,
        globalFilters: [
          {
            type: "dateRange",
            dateRange: adobeDateRange,
          },
          {
            type: "segment",
            segmentId: "s200000889_697877aa8864ef5c3c4f9030",
          },
        ],
        segmentContainer: {
          segments: [
            {
              id: pageUrl,
              definition: {
                container: {
                  func: "container",
                  context: "hits",
                  pred: {
                    func: "val-eq",
                    dim: "variables/evar6",
                  },
                },
              },
            },
          ],
        },
        metricContainer: {
          metrics: [
            {
              id: "metrics/event134",
              name: "Download Clicks (event134)",
            },
          ],
        },
        dimension: "variables/evar96",
        settings: {
          limit: 2000,
          page: 0,
          dimensionSort: "desc",
          nonesBehavior: "exclude-nones",
          countRepeatInstances: true,
        },
      };

      console.log(">> ADOBE_ENDPOINT", ADOBE_ENDPOINT, pdfdownloadBody.segmentContainer.segments);
  
      const { data: pdfdownloadData } = await axios.post(ADOBE_ENDPOINT, pdfdownloadBody, {
        headers,
        timeout: ADOBE_TIMEOUT
      });
  
      pdfData = pdfdownloadData.rows;
    } catch (err) {
      console.error(
        'Error calling Adobe Analytics Reports API (peak hour):',
        err.response?.data || err.message
      );
     
    }
  }


  return {
    pageAnalyticsMetrics: {
      ...baseMetricsObj,
      peakTrafficHourLabel,
      pdfData
    }
  };
}

module.exports = {
  fetchPageInsightsMetrics
};



