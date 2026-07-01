
(function (App) {

  const {
    toFixedNoRound,
    capitalizeFirstWord,
    getCurrentPageUrlForApis,
    formatAvgTimeLabel,
    getQualityFromPercent,
    getQualityFromSeconds,
    roundPercentTo100,
    setQualityIcon,
    updateCriticalMetrics,
    updateAllCriticalItems
  } = App.helpers;

  const {
    SECTION_MAPPING,
  } = App.constants;

  const {
    renderMetricsBySection,
  } = App.performance;

  const loader = document.getElementById("globalLoader");
  const hasConversionForm = !!document.querySelector(".ccforms");
  const isCampaignFaq = !!document.querySelector(".faq-list-container");
  const isCampaignVideo = !!document.querySelector(".video-elem__thumbnail-img");
  const isCampaignPdf = !!document.querySelector(".resource-list-container");
  const pdfSection = document.getElementById('pdf-section');
  const overallList = document.getElementById("overall-critical-points");
  const criticalItems = overallList.querySelectorAll("li");
  const pageAnalyticsDetail = document.getElementById("pageAnalyticsDetail");
  const pageAnalyticsBody = pageAnalyticsDetail
    ? pageAnalyticsDetail.querySelector(".detail-body")
    : null;

  function setAnalyticsLoading(isLoading) {
    if (!pageAnalyticsBody) return;
    pageAnalyticsBody.classList.toggle("is-loading", isLoading);
  }

  const dateRangeInput = document.getElementById("dateRangeInput");
  let currentRange = null; // { start: Date, end: Date }

  if (window.jQuery && dateRangeInput) {
    const $input = $("#dateRangeInput");
    // current month as default
    const start = moment().startOf("month");
    const end = moment().endOf("month");

    function updateLabel(startMoment, endMoment) {
      const label =
        startMoment.format("DD MMM YYYY") +
        " – " +
        endMoment.format("DD MMM YYYY");
      $input.val(label);
      currentRange = {
        start: startMoment.toDate(),
        end: endMoment.toDate(),
      };
    }

    function updateFooterDays(startMoment, endMoment) {
      const days = endMoment.diff(startMoment, "days") + 1;
      const picker = $input.data("daterangepicker");
      if (picker && picker.container) {
        const text = days === 1 ? "1 day selected" : `${days} days selected`;
        picker.container.find(".drp-selected").text(text);
      }
    }

    $input.daterangepicker(
      {
        parentEl: "#metricsSidebar",
        startDate: start,
        endDate: end,
        opens: "left",
        autoUpdateInput: false,
        locale: {
          format: "DD MMM YYYY",
          separator: " – ",
        },
      },
      function (startMoment, endMoment) {
        updateLabel(startMoment, endMoment);
        updateFooterDays(startMoment, endMoment);
        fetchAnalyticsMetrics();
      }
    );

    $input.on("show.daterangepicker", function (ev, picker) {
      const s = currentRange ? moment(currentRange.start) : picker.startDate;
      const e = currentRange ? moment(currentRange.end) : picker.endDate;
      updateFooterDays(s, e);
    });

    const pickerInstance = $input.data("daterangepicker");
    if (pickerInstance) {
      $input.off(".daterangepicker");

      $input.on("click.customDrpToggle", function (e) {
        e.stopPropagation();
        if (pickerInstance.isShowing) {
          pickerInstance.hide();
        } else {
          pickerInstance.show();
        }
      });
    }

    updateLabel(start, end);
  } else {
    console.warn(
      "Date range picker: jQuery or #dateRangeInput not found; calendar not initialized"
    );
  }

  function updatePageAnalyticsTiles(metrics = {}) {
    const totalVisitsEl = document.getElementById("totalVisitsValue");
    const uniqueVisitsEl = document.getElementById("uniqueVisitsValue");
    const bounceRateEl = document.getElementById("bounceRateValue");
    const conversionRateEl = document.getElementById("conversionRateValue");
    const avgTimeEl = document.getElementById("averageTimeSpentValue");
    const faqClickedEl = document.getElementById("faqClicked");
    const videoPlayedEl = document.getElementById("videoPlayed");
    const videoSectionEl = document.getElementById('video-section');
    const pdfdownloadedEl = document.getElementById("pdfdownloaded");
    const bounceIconEl = document.getElementById("bounceRateIcon");
    const conversionIconEl = document.getElementById("conversionRateIcon");
    const avgTimeIconEl = document.getElementById("averageTimeIcon");
    const mobilePctEl = document.getElementById("mobileVisitsPercent");
    const nonMobilePctEl = document.getElementById("nonMobileVisitsPercent");
    const peakHourEl = document.getElementById("peakTrafficHourValue");

    // NEW: Form Start / Form Submit
    const formStartEl = document.getElementById("formStartValue");
    const formSubmitEl = document.getElementById("formSubmitValue");

    // Total Visits = Visits
    if (totalVisitsEl && metrics["Visits"] != null) {
      const v = Number(metrics["Visits"]);
      totalVisitsEl.textContent = Number.isFinite(v)
        ? v.toLocaleString()
        : metrics["Visits"];
    }

    // Unique Visit = Visitors
    if (uniqueVisitsEl && metrics["Visitors"] != null) {
      const v = Number(metrics["Visitors"]);
      uniqueVisitsEl.textContent = Number.isFinite(v)
        ? v.toLocaleString()
        : metrics["Visitors"];
    }

    function showAvgTimeSpent(item) {
      const criticalItem = item.querySelector(".critical-item");

      const avgTime = getQualityFromSeconds(metrics.avgTimePerVisitSeconds);
      if (avgTime !== "high") {
        
        updateCriticalMetrics(criticalItem, `${capitalizeFirstWord(avgTime)} average time spent`, null, item, "");
      } else {
        updateCriticalMetrics(criticalItem, ``, null, item, "none"); // erase text safely
      }

      
    }

    function updateBounceRate(item) {
      if (metrics.bounceRate === null) {
        showAvgTimeSpent(item);
        return;
      }
      const bounceRateQuality = getQualityFromPercent(metrics.bounceRate);
      const criticalItem = item.querySelector(".critical-item");
      
      if (bounceRateQuality !== "low") {
        
        updateCriticalMetrics(criticalItem, `${capitalizeFirstWord(bounceRateQuality)} bounce rate`, null, item, "");
      } else if (metrics.avgTimePerVisitSeconds !== null) {
        showAvgTimeSpent(item);
      } else {
        updateCriticalMetrics(criticalItem, ``,  null, item, "none"); // erase text safely
      }
    }

    const item = criticalItems[0];
    updateBounceRate(item);
    const shimmer = item.querySelector(".shimmer-card");
    // shimmer.style.display = "none";

    // Bounce Rate (%)
    if (bounceRateEl && metrics.bounceRate != null) {
      const v = Number(metrics.bounceRate) || 0;
      bounceRateEl.textContent = `${v.toFixed(1)}%`;
      setQualityIcon(bounceIconEl, getQualityFromPercent(v));
    }

    // Conversion Rate (%)
    if (conversionRateEl) {
      const row = conversionRateEl.closest(".metric-row");

      if (!hasConversionForm) {
        if (row) row.style.display = "none";
      } else {
        if (row) row.style.display = "";

        if (metrics.conversionRate != null) {
          const v = Number(metrics.conversionRate) || 0;
          conversionRateEl.textContent = `${toFixedNoRound(v, 2)}%`;
          setQualityIcon(conversionIconEl, getQualityFromPercent(v));
        } else {
          conversionRateEl.textContent = "--";
        }
      }
    }

    // Average Time spent ("Xm Ys")
    if (avgTimeEl && metrics.avgTimePerVisitSeconds != null) {
      const seconds = metrics.avgTimePerVisitSeconds;
      avgTimeEl.textContent = formatAvgTimeLabel(seconds);
      setQualityIcon(avgTimeIconEl, getQualityFromSeconds(seconds));
    }

    // FAQ's clicked count
    if(faqClickedEl) {
      let faqData = 0;
      if(isCampaignFaq) {
        faqData = metrics.campaignFaqClicked || "0";
      } else {
        faqData = metrics.faqClicked || "0";
      }
      
      faqClickedEl.textContent = faqData;
    }
    // Video's played count 
    if(videoPlayedEl && metrics.videoPlayed !== null) {
      const videoData = metrics.videoPlayed;
      if(isCampaignVideo) {
        videoPlayedEl.textContent = videoData;
        videoSectionEl.style.display = "";
      } else {
        videoSectionEl.style.display = "none";
      }
      
    } else {
      videoSectionEl.style.display = "none";
    }

    if(pdfdownloadedEl && metrics.downloadClick !== null && isCampaignPdf) {
      pdfSection.style.display = "";
      const pdfdownload = metrics.downloadClick;
      pdfdownloadedEl.textContent = pdfdownload || 0;
    } else {
      pdfSection.style.display = "none";
    }
      
    function showPdfAccordion() {
      const container = document.getElementById('pdf-element-card');
      if (!container) return;

      // Clear previous content (in case you re-render)
      container.innerHTML = "";

      if (!Array.isArray(metrics.pdfData) || metrics.pdfData.length === 0) {
        container.innerHTML = `<div class="pdf-cards" role="status">
          <div class="pdf-name">No downloads found</div>
          <div class="pdf-count">0</div>
        </div>`;
        return;
      }

      // Build DOM nodes for each item (safer than innerHTML loops)
      const frag = document.createDocumentFragment();

      metrics.pdfData.forEach(item => {
        const card = document.createElement("div");
        card.className = "pdf-cards";

        const name = document.createElement("div");
        name.className = "pdf-name";
        name.textContent = `${item?.value ?? "Untitled"}`;

        const count = document.createElement("div");
        count.className = "pdf-count";
        count.textContent = item?.data[0];

        card.appendChild(name);
        card.appendChild(count);
        frag.appendChild(card);
      });

      container.appendChild(frag);
    }

    const mobileVisitRaw = metrics.mobileVisits | 0;
    const nonMobVisitRaw = metrics.nonMobileVisits | 0;

    const calculatedVisits = roundPercentTo100(mobileVisitRaw, nonMobVisitRaw);

    if (mobilePctEl && mobileVisitRaw != null) {
      mobilePctEl.textContent = `${calculatedVisits[0]}%`;
    }

    if (nonMobilePctEl && nonMobVisitRaw != null) {
      nonMobilePctEl.textContent = `${calculatedVisits[1]}%`;
    }
    if (peakHourEl && metrics.peakTrafficHourLabel) {
      peakHourEl.textContent = metrics.peakTrafficHourLabel;
    }

    // Form Start count (event8)
    if (formStartEl) {
      const row = formStartEl.closest(".metric-row");

      if (!hasConversionForm) {
        if (row) row.style.display = "none";
      } else {
        if (row) row.style.display = "";
        if (metrics.formStartCount != null) {
          const v = Number(metrics.formStartCount) || 0;
          formStartEl.textContent = Number.isFinite(v)
            ? v.toLocaleString()
            : metrics.formStartCount;
        } else {
          formStartEl.textContent = "--";
        }
      }
    }

    if (formSubmitEl) {
      const row = formSubmitEl.closest(".metric-row");

      if (!hasConversionForm) {
        if (row) row.style.display = "none";
      } else {
        if (row) row.style.display = "";
        if (metrics.event9 != null) {
          const v = Number(metrics.event9) || 0;
          formSubmitEl.textContent = Number.isFinite(v)
            ? v.toLocaleString()
            : metrics.event9;
        } else {
          formSubmitEl.textContent = "--";
        }
      }
    }
  }

  async function fetchAnalyticsMetrics() {
    // start blur
    setAnalyticsLoading(true);
    App.state.accessibilityLoading = true;

    try {
      const url = new URL(
        "/api/analytics/page-insights",
        window.location.origin
      );
      
      let isCampaign = false;
      const pageurl = getCurrentPageUrlForApis();

      if (pageurl.includes('-campaign-')) {
        isCampaign = true;
      } else {
        isCampaign = false;
      }

      if (currentRange) {
        const startStr = moment(currentRange.start).format("YYYY-MM-DD");
        const endStr = moment(currentRange.end).format("YYYY-MM-DD");
        url.searchParams.set("start", startStr);
        url.searchParams.set("end", endStr);
        url.searchParams.set("isCampaignPdf", false);
        url.searchParams.set("isCampaign", isCampaign);

      }
      // send page URL (with localhost fallback) to backend
      url.searchParams.set("pageUrl", pageurl);

      const criticalItem = criticalItems[0].querySelector(".critical-item");
      const shimmer = criticalItems[0].querySelector(".shimmer-card");
      updateCriticalMetrics(criticalItem, ``, "none", null, null, shimmer, "");

      const criticalItem1 = criticalItems[1].querySelector(".critical-item");
      const shimmer1 = criticalItems[1].querySelector(".shimmer-card");
      updateCriticalMetrics(criticalItem1, null, "none", null, null, shimmer1, "");

      const criticalItem2 = criticalItems[2].querySelector(".critical-item");
      const shimmer2 = criticalItems[2].querySelector(".shimmer-card");
      updateCriticalMetrics(criticalItem2, null, "none", null, null, shimmer2, "");

      const response = await fetch(url.toString());

     

      if (!response.ok) {
        throw new Error(
          `Analytics API failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const metrics = data.pageAnalyticsMetrics || {};

      updatePageAnalyticsTiles(metrics);

      renderMetricsBySection(
        metrics,
        "userBehaviourMetricsContainer",
        SECTION_MAPPING.userBehaviour
      );

      if (loader && metricSectionsContainer) {
        loader.style.display = "none";
        metricSectionsContainer.style.display = "flex";
      }
    } catch (error) {
      console.error("Adobe Analytics Process failed:", error);

      const criticalItem = criticalItems[0].querySelector(".critical-item");
      updateCriticalMetrics(criticalItem, ``, none);

      if (loader && loader.style.display !== "none") {
        loader.innerHTML = `<p style="text-align:center;color:#D92D20;font-weight:600;">
                 Oops! Unable to fetch the Analytics report.<br/>
                 Please close this tab and try again.
               </p>`;
        if (metricSectionsContainer) {
          metricSectionsContainer.style.display = "flex";
        }
      }
    } finally {
      setAnalyticsLoading(false);
      App.state.accessibilityLoading = false;
      if(App.state.pageSpeedLoading == false) {
        updateAllCriticalItems(criticalItems);
      }
    }
  }

  App.analytics = {
    fetchAnalyticsMetrics,
  };
  
})((window.App = window.App || {}));
