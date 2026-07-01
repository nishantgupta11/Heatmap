(function (App) {
  // Analytics keys
  const PAGE_ANALYTICS_KEYS = [
    "Page Views",
    "Visitors",
    "Visits",
    "Entries",
    "Exits",
    "Bounces",
  ];

  //   Section Mapping
  const SECTION_MAPPING = {
    userBehaviour: PAGE_ANALYTICS_KEYS,
    technical: [
      "Largest Contentful Paint",
      "Interaction to Next Paint",
      "Cumulative Layout Shift",
      "First Contentful Paint",
      "Speed Index",
    ],
    traffic: ["Accessibility Score"],
  };

  //   Page speed key map
  const PAGE_SPEED_KEY_MAP = {
    "Largest Contentful Paint": "lcp",
    "First Contentful Paint": "fcp",
    "Speed Index": "speedIndex",
    "Interaction to Next Paint": "inp",
    "Cumulative Layout Shift": "cls",
  };

  //   Quality icons
  const QUALITY_ICONS = {
    high: {
      src: "./images/High-green.svg",
      alt: "High",
    },
    moderate: {
      src: "./images/Moderate.svg",
      alt: "Moderate",
    },
    low: {
      src: "./images/Low-red.svg",
      alt: "Low",
    },
  };

  //   icon mappings
  const ICON_MAP = {
    "Performance Score":
      "https://beta.asianpaints.com/content/dam/page-performance/desktop-traffic.png",
    "Accessibility Score":
      "https://beta.asianpaints.com/content/dam/page-performance/page-views.png",
    "First Contentful Paint": "./images/first-contentful-paint.svg",
    "Largest Contentful Paint": "./images/largest-contentful-paint.svg",
    "Speed Index": "./images/performance-metrics.svg",
    "Interaction to Next Paint": "./images/time-to-interactive.svg",
    "Cumulative Layout Shift": "./images/total-visits.svg",
  };

  // Good / Moderate / Poor icon mapping
  const STATUS_ICON_MAP = {
    "metric-good": "./images/Good.svg",
    "metric-moderate": "./images/Moderate.svg",
    "metric-bad": "./images/Poor.svg",
  };

  App.constants = {
    PAGE_ANALYTICS_KEYS,
    SECTION_MAPPING,
    PAGE_SPEED_KEY_MAP,
    QUALITY_ICONS,
    ICON_MAP,
    STATUS_ICON_MAP,
  };
})((window.App = window.App || {}));
