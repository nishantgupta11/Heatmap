/* ---------- CTA collapse on scroll ---------- */

(function (App) {

  const {
    initPerformanceGauges,
    updatePageSpeedTabLoaders
  } = App.helpers;

  const {
    initAccessibilityToggle,
  } = App.accessibility;

  const {
    fetchAnalyticsMetrics,
  } = App.analytics;

  const {
    fetchPageSpeedMetrics,
  } = App.performance;

  document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.getElementById("metricsSidebar");
    const openBtn = document.getElementById("showMetricsBtn");
    const closeBtn = document.getElementById("closeBtn");
    const loader = document.getElementById("globalLoader");
    const desktopBtn = document.getElementById("desktopBtn");
    const mobileBtn = document.getElementById("mobileBtn");
    const metricSectionsContainer = document.getElementById(
      "metricSectionsContainer"
    );
    const overviewScreen = document.getElementById("metricsOverview");
    const detailScreens = document.querySelectorAll(".metric-detail");
    const backButtons = document.querySelectorAll(".detail-collapse-btn");
    const metricHeaders = document.querySelectorAll(".metric-card");
    const headerLogo = document.querySelector(".header-left");
    const headerBackBtn = document.getElementById("headerBackBtn");
    const sidebarHeader = document.querySelector(".sidebar-header");

    let pageSpeedCalledOnce = false;
    let analyticsCalledOnce = false;

    const showOverview = () => {
      if (overviewScreen) overviewScreen.style.display = "flex";
      detailScreens.forEach((d) => {
        d.classList.remove("active");
        d.scrollTop = 0;
      });

      if (headerLogo) headerLogo.style.display = "flex";
      if (headerBackBtn) headerBackBtn.style.display = "none";
      if (sidebarHeader) sidebarHeader.classList.remove("has-back");

      updatePageSpeedTabLoaders();
    };

    const showDetail = (detailId) => {
      if (overviewScreen) overviewScreen.style.display = "none";
      detailScreens.forEach((d) => {
        d.classList.toggle("active", d.id === detailId);
        if (d.id === detailId) d.scrollTop = 0;
      });

      if (headerLogo) headerLogo.style.display = "none";
      if (headerBackBtn) headerBackBtn.style.display = "inline-flex";
      if (sidebarHeader) sidebarHeader.classList.add("has-back");

      updatePageSpeedTabLoaders();
    };

    const collapseAllMetrics = () => {
      showOverview();
    };

    const openSidebar = () => {
      collapseAllMetrics();
      sidebar.classList.add("open");

      if (!pageSpeedCalledOnce) {
        pageSpeedCalledOnce = true;
        fetchPageSpeedMetrics();
      }

      if (!analyticsCalledOnce) {
        analyticsCalledOnce = true;
        fetchAnalyticsMetrics();
      }
    };

    const closeSidebar = () => {
      collapseAllMetrics();
      sidebar.classList.remove("open");
    };

    const toggleMetricSection = (header) => {
      const card = header.closest(".metric-card");
      if (!card) return;
      const detailId = card.getAttribute("data-detail");
      if (detailId) showDetail(detailId);
    };

    if (openBtn) openBtn.addEventListener("click", openSidebar);
    if (closeBtn) closeBtn.addEventListener("click", closeSidebar);

    if (headerBackBtn) {
      headerBackBtn.addEventListener("click", () => {
        collapseAllMetrics();
      });
    }

    metricHeaders.forEach((header) =>
      header.addEventListener("click", () => toggleMetricSection(header))
    );

    backButtons.forEach((btn) =>
      btn.addEventListener("click", () => {
        collapseAllMetrics();
      })
    );

    // Initial state
    collapseAllMetrics();
    if (loader) loader.style.display = "none";
    initPerformanceGauges();
    initAccessibilityToggle();
  });
  const cta = document.getElementById("showMetricsBtn");
  if (!cta) return;

  let collapsed = false;

  window.addEventListener("scroll", () => {
    if (!collapsed && window.scrollY > 0) {
      cta.classList.add("is-collapsed");
      collapsed = true;
    }
  });
})((window.App = window.App || {}));
