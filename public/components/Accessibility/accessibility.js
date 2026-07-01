(function (App) {
  
  const {
    updateGaugeIcon, 
    initPerformanceGauges  
  } = App.helpers;

  const {
    renderAccessibilityAudits,
  } = App.performance;


  /* Render Accessibility Metrics */

  function initAccessibilityToggle() {
    const section = document.querySelector("#accessibilityDetail");
    if (!section) return;

    const toggle = section.querySelector(".accessibility-toggle");
    const widget = section.querySelector(".performance-score-widget");

    if (!toggle || !widget) return;

    const buttons = toggle.querySelectorAll(".toggle-btn");

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.classList.contains("active")) return;

        // Toggle UI state
        buttons.forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });

        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");

        const device = btn.dataset.device;

        let score = null;
        let metricsForTable = null;

        if (
          device === "desktop" &&
          App.state.desktopMetricsState &&
          App.state.desktopMetricsState["Accessibility Score"] !== undefined
        ) {
          score = App.state.desktopMetricsState["Accessibility Score"];
          metricsForTable = App.state.desktopMetricsState;
        } else if (
          device === "mobile" &&
          App.state.mobileMetricsState &&
          App.state.mobileMetricsState["Accessibility Score"] !== undefined
        ) {
          score = App.state.mobileMetricsState["Accessibility Score"];
          metricsForTable = App.state.mobileMetricsState;
        }

        if (score !== null) {
          // Update gauge
          widget.dataset.score = score;
          widget.querySelector(".score-value").textContent = score;
          updateGaugeIcon(widget, score);
          initPerformanceGauges();
        }

        if (metricsForTable) {
          renderAccessibilityAudits(
            metricsForTable.accessibility_audits,
            "trafficMetricsContainer"
          );
        } else {
          const container = document.getElementById("trafficMetricsContainer");
          if (container) {
            container.innerHTML =
              '<p class="placeholder-text">Accessibility metrics unavailable for this device.</p>';
          }
        }
      });
    });

    // const pdfSection = document.querySelector(".metric-pdf-downloaded .accordion-header");
    // const pdfSectionContent = document.querySelector(".metric-pdf-downloaded .accordion-content");
    // const pdfSectionArrow = document.querySelector(".metric-pdf-downloaded .accordion-arrow");


    // pdfSection.addEventListener("click", () => {
    //   const isOpen = pdfSectionContent.classList.contains("open");
    //   if (isOpen) {
    //     pdfSectionContent.classList.remove("open");
    //     pdfSectionContent.style.maxHeight = null;
    //     // pdfSectionArrow.textContent = "+";
    //     pdfSectionArrow.classList.remove("open");
    //   } else {
    //     pdfSectionContent.classList.add("open");
    //     pdfSectionContent.style.maxHeight = pdfSectionContent.scrollHeight + "px";
    //     // pdfSectionArrow.textContent = "×";
    //     pdfSectionArrow.classList.add("open");
    //   }
    // });

  }

  App.accessibility = {
    initAccessibilityToggle,
  };
})((window.App = window.App || {}));





