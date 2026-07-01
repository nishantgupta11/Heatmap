(function (App) {
  const { QUALITY_ICONS } = App.constants;

  /**
   * Truncate a number to a fixed number of decimals without rounding.
   * e.g., toFixedNoRound(1.299, 2) -> 1.29 (not 1.30)
   */
  function toFixedNoRound(num, decimals) {
    const factor = 10 ** decimals;
    return Math.trunc(num * factor) / factor;
  }

  /**
   * Uppercase the very first character of a string; leaves the rest unchanged.
   */
  function capitalizeFirstWord(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * Resolve the current page URL to use for API calls.
   * If running on localhost/127.0.0.1, returns a default production URL.
   * Otherwise returns window.location.href as-is.
   */
  function getCurrentPageUrlForApis() {
    const href = window.location.href;
    if (
      href.startsWith("http://localhost") ||
      href.startsWith("https://localhost") ||
      href.startsWith("http://127.0.0.1") ||
      href.startsWith("https://127.0.0.1")
    ) {
      return "https://beta.asianpaints.com/";
    }
    return href;
  }

  /**
   * Format a duration given in seconds into a compact label.
   * Examples:
   *  - 5s       -> "05s"
   *  - 60s      -> "1m"
   *  - 75s      -> "1m 15s"
   */
  function formatAvgTimeLabel(seconds) {
    const total = Math.max(0, Number(seconds) || 0);
    const m = Math.floor(total / 60);
    const s = Math.trunc(total % 60); // truncate fractional seconds
    const ss = String(s).padStart(2, "0"); // always 2 characters

    if (m === 0) return `${ss}s`;
    if (s === 0) return `${m}m`;
    return `${m}m ${ss}s`;
  }

  /**
   * Map a percentage value (e.g., conversion/bounce) to a quality bucket.
   * Thresholds:
   *  - >= 70 : "high"
   *  - >= 50 : "moderate"
   *  - else  : "low"
   */
  function getQualityFromPercent(pct) {
    const v = Number(pct) || 0;
    if (v >= 70) return "high";
    if (v >= 50) return "moderate";
    return "low";
  }

  /**
   * Map an average time in seconds to a quality bucket.
   * Thresholds:
   *  - >= 180s : "high"
   *  - >= 60s  : "moderate"
   *  - else    : "low"
   */
  function getQualityFromSeconds(seconds) {
    const v = Number(seconds) || 0;
    if (v >= 180) return "high";
    if (v >= 60) return "moderate";
    return "low";
  }

  /**
   * Escape basic HTML characters in a string.
   * NOTE: This version double-escapes '&' to "&amp;amp;" and only handles &, <, >.
   * If you intend standard escaping (& -> &amp;), see the safer version below.
   */
  function escapeHTML(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /**
   * Split a pair of numbers into percentages that add up to exactly 100%,
   * with a configurable number of decimal places. It biases the remainder
   * to the item with the larger fractional remainder to minimize error.
   */
  function roundPercentTo100(a, b, decimals = 0) {
    const factor = Math.pow(10, decimals);
    const total = a + b;

    // Handle edge case: both zero
    if (total === 0) return [0, 0];

    // Exact scaled percentages
    const exactA = (a / total) * 100 * factor;
    const exactB = (b / total) * 100 * factor;

    // Floor to integer units at the scaled precision
    let floorA = Math.floor(exactA);
    let floorB = Math.floor(exactB);

    // Units left to reach 100% at this precision
    let leftover = 100 * factor - (floorA + floorB);

    // Remainders decide who gets the leftover units
    const remA = exactA - floorA;
    const remB = exactB - floorB;

    if (leftover > 0) {
      // Give all remaining units to the larger remainder
      if (remA > remB) {
        floorA += leftover;
      } else {
        floorB += leftover;
      }
    }

    const pA = Number((floorA / factor).toFixed(decimals));
    const pB = Number((floorB / factor).toFixed(decimals));
    return [pA, pB];
  }

  /**
   * Normalize a raw API value into a numeric primitive.
   * - Converts numeric strings with commas (e.g., "1,234") to Number
   * - For `key === "lcp"`, converts milliseconds to seconds
   * - Null/undefined becomes 0
   *
   * NOTE: This function reassigns a const in your original code (would throw).
   * Left unchanged here per your request; see note below for a safe version.
   */
  function fetchRawValue(valFromApi, key) {
    const rawValue = valFromApi;

    if (rawValue === undefined || rawValue === null) rawValue = 0;

    if (typeof rawValue === "string") {
      const num = Number(rawValue.replace(/,/g, ""));
      if (!isNaN(num)) rawValue = num;
    }

    let numeric = Number(rawValue);

    if (key === "lcp") {
      numeric = numeric / 1000; // ms -> s
    }

    return numeric;
  }

  /**
   * Map a numeric score to a gauge quality bucket.
   * WCAG thresholds:
   *  - >= 85 : "high"
   *  - >= 50 : "moderate"
   *  - else  : "low"
   *
   * Non-WCAG thresholds (Performance gauge):
   *  - >= 70 : "high"
   *  - >= 50 : "moderate"
   *  - else  : "low"
   */
  function getGaugeQualityFromScore(score, isWcag = false) {
    const v = Number(score) || 0;

    if (isWcag) {
      if (v >= 85) return "high";
      if (v >= 50) return "moderate";
      return "low";
    }

    if (v >= 70) return "high";
    if (v >= 50) return "moderate";
    return "low";
  }

  /**
   * Update the quality icon within a gauge widget based on the score.
   * Automatically detects WCAG context by checking #accessibilityDetail.
   */
  function updateGaugeIcon(widget, score) {
    if (!widget) return;
    const imgEl = widget.querySelector(".score-quality-icon");
    if (!imgEl) return;

    const isWcag = widget.closest("#accessibilityDetail") !== null;

    const quality = getGaugeQualityFromScore(score, isWcag);
    setQualityIcon(imgEl, quality);
  }

  /**
   * Initialize all circular performance gauge widgets.
   * Expects the following DOM within each .performance-score-widget:
   *  - .gauge-yellow (SVG stroke)
   *  - .gauge-violet (SVG stroke)
   *  - .score-value (text node showing numeric score)
   *
   * The function computes the stroke dash lengths and offsets to represent
   * the score visually, then updates the icon via updateGaugeIcon.
   */
  function initPerformanceGauges() {
    const C = 204; // Total circumference units used for dasharray
    const STROKE = 18; // (Unused in current logic, left for future use)
    const GAP = 2; // Small visual gap between yellow and violet arcs
    const YELLOW_BIAS = 4; // Bias to make yellow arc slightly longer

    document.querySelectorAll(".performance-score-widget").forEach((widget) => {
      const score = Math.min(
        100,
        Math.max(0, Number(widget.dataset.score || 0))
      );

      const yellow = widget.querySelector(".gauge-yellow");
      const violet = widget.querySelector(".gauge-violet");
      const valueEl = widget.querySelector(".score-value");

      if (!yellow || !violet || !valueEl) return;

      valueEl.textContent = score;

      const yellowLen = (C * score) / 100 + YELLOW_BIAS;
      const violetLen = C - yellowLen;

      yellow.style.strokeDasharray = `${yellowLen} ${C}`;
      yellow.style.strokeDashoffset = 0;

      violet.style.strokeDasharray = `${violetLen} ${C}`;
      violet.style.strokeDashoffset = -yellowLen - GAP;

      updateGaugeIcon(widget, score);
    });
  }

  /**
   * Apply a quality icon config (from QUALITY_ICONS) to an <img>.
   */
  function setQualityIcon(imgEl, qualityKey) {
    if (!imgEl || !qualityKey) return;
    const cfg = QUALITY_ICONS[qualityKey];
    if (!cfg) return;
    imgEl.src = cfg.src;
    imgEl.alt = cfg.alt;
  }

  /**
   * Convert a phrase to an acronym using ONLY words that start uppercase.
   * Example: "Largest Contentful Paint" -> "LCP"
   * Lowercase-start words are ignored per your requirement.
   */
  function toAcronym(text) {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => /^[A-Z]/.test(word)) // keep words starting with A–Z
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  /**
   * Toggle the loaders for PageSpeed tabs (Performance/Accessibility)
   * based on:
   *  - which tab is active in the DOM
   *  - global loading state: App.state.pageSpeedLoading
   *
   * Shows/hides:
   *  - #performanceTabLoader / #performanceTabContent
   *  - #accessibilityTabLoader / #accessibilityTabContent
   */
  function updatePageSpeedTabLoaders() {
    const perfLoader = document.getElementById("performanceTabLoader");
    const perfContent = document.getElementById("performanceTabContent");
    const accLoader = document.getElementById("accessibilityTabLoader");
    const accContent = document.getElementById("accessibilityTabContent");
    const perfDetail = document.getElementById("performanceDetail");
    const accDetail = document.getElementById("accessibilityDetail");

    const perfActive = perfDetail && perfDetail.classList.contains("active");
    const accActive = accDetail && accDetail.classList.contains("active");

    const showPerfLoader = App.state.pageSpeedLoading && perfActive;
    const showAccLoader = App.state.pageSpeedLoading && accActive;

    if (perfLoader) perfLoader.style.display = showPerfLoader ? "flex" : "none";
    if (perfContent) perfContent.style.display = showPerfLoader ? "none" : "";

    if (accLoader) accLoader.style.display = showAccLoader ? "flex" : "none";
    if (accContent) accContent.style.display = showAccLoader ? "none" : "";
  }

  function updateCriticalMetrics(
    item = null,
    message = null,
    itemVisibility = null,
    listItem = null,
    visibility = null,
    shimmer = null,
    shimmerVisibility = null
  ) {
    if (item !== null && message !== null) {
      item.innerHTML = message;
    }
    if (item !== null && itemVisibility !== null) {
      item.style.display = itemVisibility;
    }
    if (listItem !== null && visibility !== null) {
      listItem.style.display = visibility;
    }
    if (shimmer !== null && shimmerVisibility !== null) {
      shimmer.style.display = shimmerVisibility;
    }
  }

  function updateAllCriticalItems(items){
    const criticalItem = items[0].querySelector(".critical-item");
    const shimmer = items[0].querySelector(".shimmer-card");
    updateCriticalMetrics(criticalItem, null, "", null, null, shimmer, "none");

    const criticalItem1 = items[1].querySelector(".critical-item");
    const shimmer1 = items[1].querySelector(".shimmer-card");
    updateCriticalMetrics(criticalItem1, null, "", null, null, shimmer1, "none");

    const criticalItem2 = items[2].querySelector(".critical-item");
    const shimmer2 = items[2].querySelector(".shimmer-card");
    updateCriticalMetrics(criticalItem2, null, "", null, null, shimmer2, "none");
  }

  // Expose helpers on App namespace
  App.helpers = {
    toFixedNoRound,
    capitalizeFirstWord,
    getCurrentPageUrlForApis,
    formatAvgTimeLabel,
    getQualityFromPercent,
    getQualityFromSeconds,
    roundPercentTo100,
    escapeHTML,
    fetchRawValue,
    getGaugeQualityFromScore,
    updateGaugeIcon,
    initPerformanceGauges,
    setQualityIcon,
    toAcronym,
    updatePageSpeedTabLoaders,
    updateCriticalMetrics,
    updateAllCriticalItems
  };
})((window.App = window.App || {}));








