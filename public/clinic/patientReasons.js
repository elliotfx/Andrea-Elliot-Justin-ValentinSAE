import { checkAuth } from "../utilities/utils.js";

export function loadPatientReasons(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
    fetch(`/api/patient-satisfaction/patient-reasons`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        drawPatientReasonsChart(data.reasons);
    })
    .catch(error => console.error('Erreur lors de la récupération des données:', error));
}

// Graphique des raisons des visites
function drawPatientReasonsChart(reasonsData) {
    d3.select("#patient-reasons-chart").selectAll("*").remove();

    // Top 10 raisons
    const topReasons = reasonsData.slice(0, 10);

    const margin = { top: 60, right: 120, bottom: 80, left: 180 };
    const width = 1000 - margin.left - margin.right;
    const height = 480 - margin.top - margin.bottom;

    const svg = d3.select("#patient-reasons-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Titre
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -35)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "700")
        .style("fill", "#111827")
        .text("Raisons Principales des Visites Patients");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#6B7280")
        .text("Top 10 - Nombre de patients et temps d'attente moyen");

    const x = d3.scaleLinear()
        .domain([0, d3.max(topReasons, d => d.count) * 1.15])
        .range([0, width]);

    const y = d3.scaleBand()
        .domain(topReasons.map(d => d.reason))
        .range([0, height])
        .padding(0.35);

    // Gradient de couleur bleu-turquoise
    const colorScale = d3.scaleSequential()
        .domain([0, topReasons.length - 1])
        .interpolator(d3.interpolateRgb("#06B6D4", "#0891B2"));

    // Grille de fond
    svg.append("g")
        .attr("class", "grid")
        .attr("stroke", "#E5E7EB")
        .attr("stroke-opacity", 0.3)
        .attr("stroke-dasharray", "4,4")
        .call(d3.axisBottom(x)
            .tickSize(-height)
            .tickFormat("")
            .ticks(10)
        );

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip-reasons")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "rgba(255, 255, 255, 0.95)")
        .style("color", "#1F2937")
        .style("padding", "10px 14px")
        .style("border-radius", "8px")
        .style("box-shadow", "0 4px 12px rgba(0,0,0,0.15)")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .style("pointer-events", "none")
        .style("z-index", "1000")
        .style("border-left", "4px solid #06B6D4")
        .style("opacity", 0);

    // Barres
    svg.selectAll(".bar")
        .data(topReasons)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => y(d.reason))
        .attr("width", 0)
        .attr("height", y.bandwidth())
        .attr("fill", (d, i) => colorScale(i))
        .attr("rx", 5)
        .style("cursor", "pointer")
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))")
        .attr("opacity", 0.85)
        .on("mouseover", function (event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("opacity", 1)
                .style("filter", "drop-shadow(0 4px 8px rgba(6, 182, 212, 0.3))");
            
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`
                <div style="font-weight: 700; margin-bottom: 6px; color: #06B6D4;">${d.reason}</div>
                <div><strong>Occurrences:</strong> ${d.count} patients</div>
                <div><strong>Attente moy:</strong> ${d.avg_waiting_time || 'N/A'} min</div>
            `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 40) + "px")
                .style("visibility", "visible");
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 40) + "px");
        })
        .on("mouseout", function () {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("opacity", 0.85)
                .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");
            
            tooltip.transition().duration(200).style("opacity", 0);
        })
        .transition()
        .duration(1200)
        .delay((d, i) => i * 80)
        .attr("width", d => x(d.count));

    // Valeurs sur les barres
    svg.selectAll(".value-label")
        .data(topReasons)
        .enter().append("text")
        .attr("class", "value-label")
        .attr("x", d => x(d.count) + 12)
        .attr("y", d => y(d.reason) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#6B7280")
        .attr("opacity", 0)
        .text(d => d.count)
        .transition()
        .delay((d, i) => 1200 + i * 80)
        .duration(500)
        .attr("opacity", 1);

    // Axe X
    const xAxis = svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x)
            .ticks(10)
            .tickFormat(d => d)
            .tickSize(6)
        )
        .attr("stroke-width", 1.5)
        .attr("stroke", "#6B7280");

    xAxis.selectAll("line")
        .attr("stroke", "#D1D5DB")
        .attr("stroke-width", 1.5);

    xAxis.selectAll("text")
        .style("font-size", "12px")
        .style("fill", "#374151")
        .style("font-weight", "500");

    xAxis.select(".domain")
        .attr("stroke", "#1F2937")
        .attr("stroke-width", 2);

    // Axe Y
    const yAxis = svg.append("g")
        .call(d3.axisLeft(y)
            .tickSize(0)
        )
        .attr("stroke-width", 1.5)
        .attr("stroke", "#6B7280");

    yAxis.selectAll("text")
        .style("font-size", "11px")
        .style("fill", "#374151")
        .style("font-weight", "500");

    yAxis.select(".domain")
        .attr("stroke", "#1F2937")
        .attr("stroke-width", 2);

    // Ligne d'axe Y
    svg.append("line")
        .attr("x1", 0)
        .attr("x2", 0)
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "#1F2937")
        .attr("stroke-width", 2);

    // Ligne d'axe X
    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", height)
        .attr("y2", height)
        .attr("stroke", "#1F2937")
        .attr("stroke-width", 2);

    // Labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 60)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .style("fill", "#374151")
        .text("Nombre de patients");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -155)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .style("fill", "#374151")
        .text("Raisons de visite");
}
