// yearlyVisitsChart.js - Bar chart showing visits grouped by year with adjustable granularity

let currentDoctorId = null;
let currentGranularity = 'month';
let currentMonthFilter = 'all';

export function updateYearlyVisitsChart(doctorId) {
    currentDoctorId = doctorId;
    loadChartData();

    // Setup granularity selector event listener
    const granularitySelect = document.getElementById('granularity-select');
    if (granularitySelect && !granularitySelect.dataset.listenerAdded) {
        granularitySelect.addEventListener('change', (e) => {
            currentGranularity = e.target.value;
            loadChartData();
        });
        granularitySelect.dataset.listenerAdded = 'true';
    }

    // Setup month filter selector event listener
    const monthFilterSelect = document.getElementById('month-filter-select');
    if (monthFilterSelect && !monthFilterSelect.dataset.listenerAdded) {
        monthFilterSelect.addEventListener('change', (e) => {
            currentMonthFilter = e.target.value;
            loadChartData();
        });
        monthFilterSelect.dataset.listenerAdded = 'true';
    }
}

function loadChartData() {
    const token = localStorage.getItem('token');

    if (!token || !currentDoctorId) {
        console.error('Token or doctor ID missing');
        return;
    }

    // Fetch data from API
    fetch(`/api/doctor-performance/visits-by-day-of-year?doctorId=${currentDoctorId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(dataByYear => {
            // Transform data based on granularity
            const aggregatedData = aggregateDataByGranularity(dataByYear, currentGranularity);
            createBarChart(aggregatedData);
        })
        .catch(error => console.error('Erreur lors de la récupération des données:', error));
}

function aggregateDataByGranularity(dataByYear, granularity) {
    const result = {};

    Object.keys(dataByYear).forEach(year => {
        result[year] = [];
        const visitsByPeriod = {};

        dataByYear[year].forEach(item => {
            // Calculate month for filtering
            const itemMonth = Math.ceil(item.dayOfYear / 30.4167);

            // Skip if month filter is active and doesn't match
            if (currentMonthFilter !== 'all' && itemMonth !== parseInt(currentMonthFilter)) {
                return;
            }

            let periodKey;

            if (granularity === 'month') {
                // Group by month (1-12)
                periodKey = itemMonth;
            } else if (granularity === 'week') {
                // Group by week (1-52)
                periodKey = Math.ceil(item.dayOfYear / 7);
            } else {
                // Day - use dayOfYear directly
                periodKey = item.dayOfYear;
            }

            if (!visitsByPeriod[periodKey]) {
                visitsByPeriod[periodKey] = 0;
            }
            visitsByPeriod[periodKey] += item.visitCount;
        });

        // Convert to array format
        Object.keys(visitsByPeriod).forEach(period => {
            result[year].push({
                period: parseInt(period),
                visitCount: visitsByPeriod[period]
            });
        });

        result[year].sort((a, b) => a.period - b.period);
    });

    return result;
}

function createBarChart(dataByYear) {
    // Clear previous chart
    d3.select("#yearly-visits-chart").selectAll("*").remove();

    // Chart dimensions
    const margin = { top: 40, right: 120, bottom: 60, left: 70 };
    const width = 1200 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select("#yearly-visits-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Get all years and periods
    const years = Object.keys(dataByYear).sort();
    const allPeriods = new Set();
    years.forEach(year => {
        dataByYear[year].forEach(d => allPeriods.add(d.period));
    });
    const periods = Array.from(allPeriods).sort((a, b) => a - b);

    // Color scale
    const colorScale = d3.scaleOrdinal()
        .domain(years)
        .range(d3.schemeCategory10);

    // Find max visit count for y-axis
    let maxVisits = 0;
    years.forEach(year => {
        const yearMax = d3.max(dataByYear[year], d => d.visitCount);
        if (yearMax > maxVisits) maxVisits = yearMax;
    });

    // Create scales
    const x0 = d3.scaleBand()
        .domain(periods)
        .range([0, width])
        .padding(0.2);

    const x1 = d3.scaleBand()
        .domain(years)
        .range([0, x0.bandwidth()])
        .padding(0.05);

    const y = d3.scaleLinear()
        .domain([0, maxVisits * 1.1])
        .range([height, 0]);

    // Create axes
    const xAxis = d3.axisBottom(x0)
        .tickFormat(d => {
            if (currentGranularity === 'month') {
                const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
                return months[Math.min(d - 1, 11)] || d;
            } else if (currentGranularity === 'week') {
                return `S${d}`;
            } else {
                return d;
            }
        });

    const yAxis = d3.axisLeft(y);

    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis)
        .append("text")
        .attr("x", width / 2)
        .attr("y", 40)
        .attr("fill", "black")
        .style("font-size", "14px")
        .style("text-anchor", "middle")
        .text(currentGranularity === 'month' ? 'Mois' : currentGranularity === 'week' ? 'Semaine' : 'Jour');

    // Add Y axis
    svg.append("g")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("fill", "black")
        .style("font-size", "14px")
        .style("text-anchor", "middle")
        .text("Nombre de visites");

    // Add bars
    const periodGroups = svg.selectAll(".period-group")
        .data(periods)
        .enter()
        .append("g")
        .attr("class", "period-group")
        .attr("transform", d => `translate(${x0(d)},0)`);

    years.forEach(year => {
        periodGroups.each(function (period) {
            const dataPoint = dataByYear[year].find(d => d.period === period);
            if (dataPoint) {
                d3.select(this)
                    .append("rect")
                    .attr("x", x1(year))
                    .attr("y", y(dataPoint.visitCount))
                    .attr("width", x1.bandwidth())
                    .attr("height", height - y(dataPoint.visitCount))
                    .attr("fill", colorScale(year))
                    .style("opacity", 0.8)
                    .on("mouseover", function (event) {
                        d3.select(this).style("opacity", 1);
                        tooltip.transition().duration(200).style("opacity", 1);
                        let periodLabel = period;
                        if (currentGranularity === 'month') {
                            const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
                            periodLabel = months[period - 1] || period;
                        } else if (currentGranularity === 'week') {
                            periodLabel = `Semaine ${period}`;
                        } else {
                            periodLabel = `Jour ${period}`;
                        }
                        tooltip.html(`<strong>${year}</strong><br>${periodLabel}<br>Visites: ${dataPoint.visitCount}`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function () {
                        d3.select(this).style("opacity", 0.8);
                        tooltip.transition().duration(500).style("opacity", 0);
                    });
            }
        });
    });

    // Add legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 20}, 20)`);

    years.forEach((year, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 25})`);

        legendRow.append("rect")
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", colorScale(year));

        legendRow.append("text")
            .attr("x", 30)
            .attr("y", 15)
            .style("font-size", "12px")
            .text(year);
    });

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(`Évolution des visites ${currentGranularity === 'month' ? 'par mois' : currentGranularity === 'week' ? 'par semaine' : 'par jour'}`);

    // Add tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip-yearly")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0);
}
