import { checkAuth } from "../utilities/utils.js";

export function loadWaitingTimes(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
    fetch(`/api/waiting-times?start-date=${startDate}&end-date=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        drawMonthlyWaitingTimeChart(data.avg_waiting_time_by_month);
        drawDoctorWaitingTimeChart(data.avg_waiting_time_by_doctor);
    })
    .catch(error => console.error('Erreur lors de la récupération des données:', error));
}

// Graphique mensuel avec area chart moderne
function drawMonthlyWaitingTimeChart(monthlyData) {
    d3.select("#waiting-time-monthly-chart").selectAll("*").remove();

    const margin = { top: 60, right: 80, bottom: 60, left: 100 };
    const width = 1200 - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    const svg = d3.select("#waiting-time-monthly-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Titre
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "600")
        .style("fill", "#1F2937")
        .text("Évolution du Temps d'Attente Mensuel");

    const x = d3.scalePoint()
        .domain(monthlyData.map(d => d.month))
        .range([0, width])
        .padding(0.5);

    const y = d3.scaleLinear()
        .domain([0, d3.max(monthlyData, d => d.avg_waiting_time) * 1.15])
        .nice()
        .range([height, 0]);

    // Gradient pour l'area
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "waiting-area-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#EC4899")
        .attr("stop-opacity", 0.6);

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#EC4899")
        .attr("stop-opacity", 0);

    // Area generator
    const area = d3.area()
        .x(d => x(d.month))
        .y0(height)
        .y1(d => y(d.avg_waiting_time))
        .curve(d3.curveMonotoneX);

    // Line generator
    const line = d3.line()
        .x(d => x(d.month))
        .y(d => y(d.avg_waiting_time))
        .curve(d3.curveMonotoneX);

    // Dessiner l'area
    svg.append("path")
        .datum(monthlyData)
        .attr("class", "area")
        .attr("fill", "url(#waiting-area-gradient)")
        .attr("d", area);

    // Dessiner la ligne
    svg.append("path")
        .datum(monthlyData)
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "#EC4899")
        .attr("stroke-width", 3)
        .attr("d", line);

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("visibility", "hidden")
        .style("background-color", "rgba(255, 255, 255, 0.95)")
        .style("color", "#1F2937")
        .style("padding", "12px 16px")
        .style("border-radius", "8px")
        .style("box-shadow", "0 4px 6px rgba(0,0,0,0.1)")
        .style("font-size", "14px")
        .style("pointer-events", "none")
        .style("z-index", "1000");

    // Points sur la ligne
    svg.selectAll(".dot")
        .data(monthlyData)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.month))
        .attr("cy", d => y(d.avg_waiting_time))
        .attr("r", 5)
        .attr("fill", "#EC4899")
        .attr("stroke", "#FFFFFF")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 8);
            
            tooltip.style("visibility", "visible")
                .html(`
                    <div style="font-weight: 600; margin-bottom: 6px; color: #EC4899;">${d.month}</div>
                    <div><strong>Attente:</strong> ${d.avg_waiting_time.toFixed(1)} min</div>
                `);
        })
        .on("mousemove", function(event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 5);
            
            tooltip.style("visibility", "hidden");
        });

    // Axes
    const xAxis = svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .style("font-size", "12px");

    xAxis.selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    const yAxis = svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => d + ' min'))
        .style("font-size", "12px");

    // Label Y
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -70)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("fill", "#6B7280")
        .text("Temps d'attente (minutes)");
}

// Graphique des médecins avec barres verticales améliorées
function drawDoctorWaitingTimeChart(doctorsData) {
    const margin = { top: 20, right: 20, bottom: 70, left: 60 }; // Marges
    const width = 900 - margin.left - margin.right; // Largeur du graphique
    const height = 450 - margin.top - margin.bottom; // Hauteur du graphique

    const svg = d3.select("#waiting-time-doctors-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    svg.selectAll("*").remove(); // Supprimer l'ancien graphique

    const xScale = d3.scaleBand().range([0, width]).padding(0.4);
    const yScale = d3.scaleLinear().range([height, 0]);

    // Définir les domaines de l'échelle x et y
    xScale.domain(doctorsData.map(d => d.doctor_name));
    yScale.domain([0, 120]); // Limite maximale à 120 minutes

    // Grille de fond subtile pour meilleure lisibilité
    svg.append("g")
        .attr("class", "grid")
        .attr("stroke", "#E5E7EB")
        .attr("stroke-opacity", 0.3)
        .attr("stroke-dasharray", "4,4")
        .call(d3.axisLeft(yScale).ticks(10)
            .tickSize(-width)
            .tickFormat("")
        );

    // Ajout des axes avec meilleur style
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .attr("stroke-width", 1.5)
        .attr("stroke", "#6B7280")
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "12px")
        .style("fill", "#374151")
        .style("font-weight", "500");

    // Ajout de l'axe Y avec des valeurs de temps d'attente
    svg.append("g")
        .call(d3.axisLeft(yScale).ticks(10))
        .attr("stroke-width", 1.5)
        .attr("stroke", "#6B7280")
        .selectAll("text")
        .style("font-size", "12px")
        .style("fill", "#374151")
        .style("font-weight", "500");

    // Axe Y ligne épaisse
    svg.append("line")
        .attr("x1", 0)
        .attr("x2", 0)
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "#1F2937")
        .attr("stroke-width", 2);

    // Axe X ligne épaisse
    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", height)
        .attr("y2", height)
        .attr("stroke", "#1F2937")
        .attr("stroke-width", 2);

    // Ajouter les lignes horizontales (vert à 30, jaune à 45, rouge à 60, noir à 120)
    const thresholds = [
        { value: 30, color: "#10B981" },
        { value: 45, color: "#F59E0B" },
        { value: 60, color: "#EF4444" },
        { value: 120, color: "#6B7280" }
    ];

    thresholds.forEach(threshold => {
        svg.append("line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", yScale(threshold.value))
            .attr("y2", yScale(threshold.value))
            .attr("stroke", threshold.color)
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,4")
            .attr("opacity", 0.6);
    });

    // Tooltip amélioré
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
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
        .style("border-left", "4px solid #EC4899")
        .style("opacity", 0);

    // Couleurs avec gradient
    const colorScale = d3.scaleSequential()
        .domain([0, doctorsData.length - 1])
        .interpolator(d3.interpolateRgb("#EC4899", "#8B5CF6"));

    // Ajout des barres avec animations
    svg.selectAll(".bar")
        .data(doctorsData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.doctor_name))
        .attr("y", d => yScale(d.avg_waiting_time_per_doctor))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - yScale(d.avg_waiting_time_per_doctor))
        .attr("fill", (d, i) => colorScale(i))
        .attr("rx", 5)
        .style("cursor", "pointer")
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))")
        .attr("opacity", 0.8)
        .on("mouseover", function (event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("opacity", 1)
                .style("filter", "drop-shadow(0 4px 8px rgba(236, 72, 153, 0.3))");
            
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`<div style="font-weight: 700; margin-bottom: 4px;">${d.doctor_name}</div><div><strong>Temps:</strong> ${d.avg_waiting_time_per_doctor.toFixed(1)} min</div>`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 40) + "px")
                .style("visibility", "visible");
        })
        .on("mouseout", function () {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("opacity", 0.8)
                .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");
            
            tooltip.transition().duration(200).style("opacity", 0);
        })
        .transition()
        .duration(1000)
        .delay((d, i) => i * 80)
        .attr("y", d => yScale(d.avg_waiting_time_per_doctor));

    // Ajout du texte pour chaque barre
    svg.selectAll(".text")
        .data(doctorsData)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", d => xScale(d.doctor_name) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.avg_waiting_time_per_doctor) - 8)
        .attr("dy", ".75em")
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", "#6B7280")
        .attr("opacity", 0)
        .text(d => d.avg_waiting_time_per_doctor.toFixed(1) + " min")
        .transition()
        .delay((d, i) => 1000 + i * 80)
        .duration(500)
        .attr("opacity", 1);

    // Label axe Y
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .attr("fill", "#374151")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .text("Temps d'attente (minutes)");

    // Label axe X
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 60)
        .attr("text-anchor", "middle")
        .attr("fill", "#374151")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .text("Médecins");
}
