(function (App) {
    const {
        getCurrentPageUrlForApis,
        escapeHTML,
        fetchRawValue,
        getGaugeQualityFromScore,
        updateGaugeIcon,
        initPerformanceGauges,
        toAcronym,
        updatePageSpeedTabLoaders,
        updateCriticalMetrics,
        updateAllCriticalItems,
    } = App.helpers;

    const { SECTION_MAPPING, PAGE_SPEED_KEY_MAP, ICON_MAP, STATUS_ICON_MAP } =
        App.constants;

    const overallList = document.getElementById("overall-critical-points");
    const criticalItems = overallList.querySelectorAll("li");
    const loader = document.getElementById("globalLoader");

    function getFirstAudit(groups) {
        const order = ["contrast", "altText", "labels", "aria", "other"];
        for (const key of order) {
            if (groups[key] && groups[key].length > 0) {
                return groups[key][0];
            }
        }
        return null;
    }

    function getAuditGroups(data) {
        const GROUPS = {
            contrast: [],
            altText: [],
            labels: [],
            aria: [],
            other: [],
        };
        // Group audits by keywords in their IDs

        Object.keys(data).forEach((id) => {
            const audit = data[id];
            if (id.includes("contrast")) GROUPS.contrast.push(audit);
            else if (id.includes("alt")) GROUPS.altText.push(audit);
            else if (id.includes("label")) GROUPS.labels.push(audit);
            else if (id.includes("aria")) GROUPS.aria.push(audit);
            else GROUPS.other.push(audit);
        });

        return GROUPS;
    }

    function getFirstAuditTitle(metrics, scoreKey, invalidValue) {
        const value = getGaugeQualityFromScore(metrics[scoreKey], true);
        if (value === invalidValue) return null;
        const groups = getAuditGroups(metrics.accessibility_audits);
        const firstAudit = getFirstAudit(groups);
        return firstAudit ? firstAudit.title : null;
    }

    function updateAccessibility(desktop, mobile, item) {
        const criticalItem = item.querySelector(".critical-item");
        const shimmer = item.querySelector(".shimmer-card");

        const desktopTitle = getFirstAuditTitle(
            desktop,
            "Accessibility Score",
            "high",
        );
        if (desktopTitle) {
            updateCriticalMetrics(criticalItem, desktopTitle, null, item, "");
            return;
        }
        const mobileTitle = getFirstAuditTitle(
            mobile,
            "Accessibility Score",
            "high",
        );
        if (mobileTitle) {
            updateCriticalMetrics(criticalItem, mobileTitle, null, item, "");
            return;
        }
        updateCriticalMetrics(criticalItem, "", null, item, "none");
    }

    async function fetchPageSpeedMetrics() {
        // existing global loader behavior
        if (loader && metricSectionsContainer) {
            loader.style.display = "flex";
            metricSectionsContainer.style.display = "none";
        }

        App.state.pageSpeedLoading = true;
        updatePageSpeedTabLoaders();

        const currentUrl = getCurrentPageUrlForApis();

        try {
            const criticalItem = criticalItems[0].querySelector(".critical-item");
            const shimmer = criticalItems[0].querySelector(".shimmer-card");
            updateCriticalMetrics(criticalItem, "", "none", null, null, shimmer, "");

            const criticalItem1 = criticalItems[1].querySelector(".critical-item");
            const shimmer1 = criticalItems[1].querySelector(".shimmer-card");
            updateCriticalMetrics(
                criticalItem1,
                "",
                "none",
                null,
                null,
                shimmer1,
                "",
            );

            const criticalItem2 = criticalItems[2].querySelector(".critical-item");
            const shimmer2 = criticalItems[2].querySelector(".shimmer-card");
            updateCriticalMetrics(
                criticalItem2,
                "",
                "none",
                null,
                null,
                shimmer2,
                "",
            );

            const response = await fetch(
                `/api/pagespeed?url=${encodeURIComponent(currentUrl)}`,
            );

            if (!response.ok) {
                throw new Error(
                    `PageSpeed API failed: ${response.status} ${response.statusText}`,
                );
            }

            const data = await response.json();

            App.state.desktopMetricsState = data.desktop || {};
            App.state.mobileMetricsState = data.mobile || {};

            // Performance detail grid (desktop by default)
            renderMetricsBySection(
                App.state.desktopMetricsState,
                "desktopMetrics",
                SECTION_MAPPING.technical,
            );

            const item = criticalItems[1];
            updatelcp(
                App.state.desktopMetricsState,
                App.state.mobileMetricsState,
                item,
            );

            const itemLast = criticalItems[2];
            updateAccessibility(
                App.state.desktopMetricsState,
                App.state.mobileMetricsState,
                itemLast,
            );

            // Accessibility detail
            renderAccessibilityAudits(
                data.desktop.accessibility_audits,
                "trafficMetricsContainer",
            );
        } catch (error) {
            const criticalItem = criticalItems[1].querySelector(".critical-item");
            updateCriticalMetrics(criticalItem, "", "none");

            const criticalItem2 = criticalItems[2].querySelector(".critical-item");
            updateCriticalMetrics(criticalItem2, "", "none");
            console.error("PageSpeed fetch failed:", error);
        } finally {
            App.state.pageSpeedLoading = false;
            if (App.state.accessibilityLoading == false) {
                updateAllCriticalItems(criticalItems);
            }
            updatePageSpeedTabLoaders();
        }

        updatePerformanceGauge("desktop");

        const accessibilityWidget = document.querySelector(
            "#accessibilityDetail .performance-score-widget",
        );

        if (
            accessibilityWidget &&
            App.state.desktopMetricsState["Accessibility Score"] !== undefined
        ) {
            const score = App.state.desktopMetricsState["Accessibility Score"];
            accessibilityWidget.dataset.score = score;
            accessibilityWidget.querySelector(".score-value").textContent = score;
            updateGaugeIcon(accessibilityWidget, score);
            initPerformanceGauges();
        }
    }

    function renderAccessibilityAudits(data, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = "";

        const groups = getAuditGroups(data);

        function renderGroup(title, audits) {
            if (audits.length === 0) return;
            const section = document.createElement("div");
            section.className = "group-section";
            section.innerHTML = `<span class='group-title'>${title} (${audits.length})</span>`;

            audits.forEach((audit) => {
                const accordion = document.createElement("div");
                accordion.className = "accordion";

                const header = document.createElement("div");
                header.className = "accordion-header";

                const titleSpan = document.createElement("span");
                titleSpan.textContent = audit.title;

                const arrow = document.createElement("span");
                arrow.className = "accordion-arrow";
                arrow.textContent = "+";

                header.appendChild(titleSpan);
                header.appendChild(arrow);

                const content = document.createElement("div");
                content.className = "accordion-content";

                let failingCards = "";
                if (audit.details && audit.details.items) {
                    failingCards = audit.details.items
                        .map((item) => {
                            return `
                <div class="element-card">
                  <h4>${item.node?.selector || "Unknown element"}</h4>
                  ${item.node?.snippet
                                    ? `<pre class="search-placeholder">${escapeHTML(
                                        item.node.snippet,
                                    )}</pre>`
                                    : ""
                                }
                  ${item.node?.screenshot
                                    ? `<img src="${item.node.screenshot}" />`
                                    : ""
                                }
                </div>
              `;
                        })
                        .join("");
                }

                content.innerHTML = `
            ${failingCards}
          `;

                header.addEventListener("click", () => {
                    const isOpen = content.classList.contains("open");
                    if (isOpen) {
                        content.classList.remove("open");
                        content.style.maxHeight = null;
                        arrow.textContent = "+";
                        arrow.classList.remove("open");
                    } else {
                        content.classList.add("open");
                        content.style.maxHeight = content.scrollHeight + "px";
                        arrow.textContent = "×";
                        arrow.classList.add("open");
                    }
                });

                accordion.appendChild(header);
                accordion.appendChild(content);
                section.appendChild(accordion);
            });

            container.appendChild(section);
        }

        renderGroup("Contrast Issues", groups.contrast);
        renderGroup("Alt Text Issues", groups.altText);
        renderGroup("Label Issues", groups.labels);
        renderGroup("ARIA Issues", groups.aria);
        renderGroup("Other Accessibility Issues", groups.other);
    }

    if (desktopBtn && mobileBtn) {
        desktopBtn.setAttribute("aria-selected", "true");
        mobileBtn.setAttribute("aria-selected", "false");

        desktopBtn.addEventListener("click", () => {
            if (desktopBtn.classList.contains("active")) return;

            desktopBtn.classList.add("active");
            mobileBtn.classList.remove("active");
            desktopBtn.setAttribute("aria-selected", "true");
            mobileBtn.setAttribute("aria-selected", "false");

            if (App.state.desktopMetricsState) {
                renderMetricsBySection(
                    App.state.desktopMetricsState,
                    "desktopMetrics",
                    SECTION_MAPPING.technical,
                );
                updatePerformanceGauge("desktop");
            }
        });

        mobileBtn.addEventListener("click", () => {
            if (mobileBtn.classList.contains("active")) return;

            mobileBtn.classList.add("active");
            desktopBtn.classList.remove("active");
            mobileBtn.setAttribute("aria-selected", "true");
            desktopBtn.setAttribute("aria-selected", "false");

            if (App.state.mobileMetricsState) {
                renderMetricsBySection(
                    App.state.mobileMetricsState,
                    "desktopMetrics",
                    SECTION_MAPPING.technical,
                );
                updatePerformanceGauge("mobile");
            } else {
                const container = document.getElementById("desktopMetrics");
                if (container) {
                    container.innerHTML =
                        '<p class="placeholder-text">Mobile metrics unavailable.</p>';
                }
            }
        });
    }

    // update Performance gauge for desktop/mobile
    function updatePerformanceGauge(device = "desktop") {
        const widget = document.querySelector(
            "#performanceDetail .performance-score-widget",
        );
        if (!widget) return;

        const source =
            device === "mobile"
                ? App.state.mobileMetricsState
                : App.state.desktopMetricsState;
        if (!source || source["Performance Score"] === undefined) return;

        const score = source["Performance Score"];

        widget.dataset.score = score;
        const valueEl = widget.querySelector(".score-value");
        if (valueEl) valueEl.textContent = score;

        updateGaugeIcon(widget, score);
        initPerformanceGauges();
    }
    function updatelcp(desktopMetricData, mobileMetricData, item) {
        const criticalItem = item.querySelector(".critical-item");
        const shimmer = item.querySelector(".shimmer-card");

        const METRIC_CONFIGS = [
            {
                label: "Largest Contentful Paint",
                key: "lcp",
                device: "desktop",
                data: desktopMetricData,
            },
            {
                label: "Largest Contentful Paint",
                key: "lcp",
                device: "mobile",
                data: mobileMetricData,
            },
            {
                label: "Cumulative Layout Shift",
                key: "cls",
                device: "desktop",
                data: desktopMetricData,
            },
            {
                label: "Cumulative Layout Shift",
                key: "cls",
                device: "mobile",
                data: mobileMetricData,
            },
        ];

        function classifySafe({ label, key, device, data }) {
            const metricKey = PAGE_SPEED_KEY_MAP[label];
            const raw = data[metricKey];
            if (raw == null) return null;
            const score = classifyMetricByKey(label, fetchRawValue(raw, key), device);
            return score.className !== "metric-good"
                ? `${label} is ${score.className.replace("metric-", "")} in ${device}`
                : null;
        }

        for (const config of METRIC_CONFIGS) {
            const message = classifySafe(config);
            if (message) {
                updateCriticalMetrics(criticalItem, message, null, item, "");

                return;
            }
        }
        // If all metrics are good or null, remove the item
        updateCriticalMetrics(criticalItem, "", null, item, "none");
    }

    function renderMetricsBySection(metrics, containerId, metricKeys) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = "";

        if (!metrics || Object.keys(metrics).length === 0) {
            container.innerHTML =
                '<p class="placeholder-text" style="color:red;">Metrics data unavailable.</p>';
            return;
        }

        if (containerId === "mobileMetrics" && Object.keys(metrics).length === 0) {
            container.innerHTML =
                '<p class="placeholder-text">Mobile metrics will be loaded here.</p>';
            return;
        }

        const listWrapper = document.createElement("div");
        listWrapper.className = "detail-metrics-grid-engagement";

        metricKeys.forEach((key) => {
            const dataKey = PAGE_SPEED_KEY_MAP[key] || key;
            let rawValue = metrics[dataKey];

            if (rawValue === undefined || rawValue === null) rawValue = 0;

            if (typeof rawValue === "string") {
                const num = Number(rawValue.replace(/,/g, ""));
                if (!isNaN(num)) rawValue = num;
            }

            let formattedValue;
            let numeric = Number(rawValue);

            // format by metric type
            switch (key) {
                case "Largest Contentful Paint":
                case "First Contentful Paint":
                case "Speed Index":
                    numeric = numeric / 1000; // ms -> s
                    formattedValue = numeric.toFixed(1) + " s";
                    break;

                case "Interaction to Next Paint":
                    formattedValue = numeric.toFixed(0) + " ms";
                    break;

                case "Cumulative Layout Shift":
                    formattedValue = numeric.toFixed(2);
                    break;

                default:
                    formattedValue =
                        typeof rawValue === "number" ? rawValue.toLocaleString() : rawValue;
            }

            // classification (Good / Moderate / Poor)
            let classification = null;
            const device =
                mobileBtn && mobileBtn.classList.contains("active")
                    ? "mobile"
                    : "desktop";

            if (
                [
                    "Largest Contentful Paint",
                    "First Contentful Paint",
                    "Speed Index",
                    "Interaction to Next Paint",
                    "Cumulative Layout Shift",
                ].includes(key)
            ) {
                classification = classifyMetricByKey(key, numeric, device);
            } else if (key === "Accessibility Score") {
                classification = classifyAccessibilityScore(rawValue);
            }

            const iconUrl =
                ICON_MAP[key] ||
                "https://cdn-icons-png.flaticon.com/512/565/565547.png";

            const row = document.createElement("div");
            row.className = "metric-row";

            row.innerHTML = `
      <div class="metric-left">
        <span class="metric-icon">
          <img src="${iconUrl}" class="page-performance-icon" alt="${key} icon"/>
        </span>
        <span class="metric-label long">${key}</span>
        <span class="metric-label short">${toAcronym(key)}</span>
      </div>

      <div class="metric-middle">
        <span class="metric-value">${formattedValue}</span>
      </div>

      <div class="metric-right">
        ${classification
                    ? `<span class="metric-rating ${classification.className}">
                 <img
                   src="${STATUS_ICON_MAP[classification.className]}"
                   class="metric-status-icon"
                   alt="${classification.label || ""}"
                 />
               </span>`
                    : ""
                }
      </div>
    `;

            listWrapper.appendChild(row);
        });

        container.appendChild(listWrapper);
    }

    function classifyAccessibilityScore(value) {
        const v = Number(value) || 0;
        if (v >= 85) {
            return { label: "Good", className: "metric-good" };
        }
        if (v >= 50) {
            return { label: "Moderate", className: "metric-moderate" };
        }
        return { label: "Poor", className: "metric-bad" };
    }

    function classifyMetricByKey(key, value, device = "desktop") {
        switch (key) {
            case "Largest Contentful Paint":
                if (value <= 2.5) return { label: "Good", className: "metric-good" };
                if (value <= 4.0)
                    return { label: "Needs Improvement", className: "metric-moderate" };
                return { label: "Poor", className: "metric-bad" };

            case "Interaction to Next Paint":
                if (value <= 200) return { label: "Good", className: "metric-good" };
                if (value <= 500)
                    return { label: "Needs Improvement", className: "metric-moderate" };
                return { label: "Poor", className: "metric-bad" };

            case "Cumulative Layout Shift":
                if (value <= 0.1) return { label: "Good", className: "metric-good" };
                if (value <= 0.25)
                    return { label: "Needs Improvement", className: "metric-moderate" };
                return { label: "Poor", className: "metric-bad" };

            case "First Contentful Paint":
                if (value <= 1.8) return { label: "Good", className: "metric-good" };
                if (value <= 3.0)
                    return { label: "Needs Improvement", className: "metric-moderate" };
                return { label: "Poor", className: "metric-bad" };

            case "Speed Index":
                if (device === "mobile") {
                    if (value <= 3.4) return { label: "Good", className: "metric-good" };
                    if (value <= 5.8)
                        return {
                            label: "Needs Improvement",
                            className: "metric-moderate",
                        };
                    return { label: "Poor", className: "metric-bad" };
                } else {
                    if (value <= 1.3) return { label: "Good", className: "metric-good" };
                    if (value <= 2.3)
                        return {
                            label: "Needs Improvement",
                            className: "metric-moderate",
                        };
                    return { label: "Poor", className: "metric-bad" };
                }

            default:
                return null;
        }
    }

    App.performance = {
        fetchPageSpeedMetrics,
        renderMetricsBySection,
        getAuditGroups,
        renderAccessibilityAudits,
    };
})((window.App = window.App || {}));
