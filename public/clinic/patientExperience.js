import { checkAuth } from "../utilities/utils.js";

export function loadPatientExperienceChart(startDate, endDate) {
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
        drawWaitingTimeChart(data.avg_waiting_time_by_month);
        drawDoctorWaitingTimeChart(data.avg_waiting_time_by_doctor);
    })
    .catch(error => console.error('Erreur lors de la récupération des données:', error));
}

function drawWaitingTimeChart(monthlyData) {
    const svg = d3.select("#waiting-time-chart");
    const margin = { top: 20, right: 20, bottom: 70, left: 60 };
    const width = 1200 - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    svg.attr("width", width + margin.left + margin.right)
       .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand().range([0, width]).padding(0.4);
    const yScale = d3.scaleLinear().range([height, 0]);

    xScale.domain(monthlyData.map(d => d.month));
    yScale.domain([0, 120]);

    // Grille
    g.append("g")
     .attr("class", "grid")
     .call(d3.axisLeft(yScale).ticks(8).tickSize(-width).tickFormat(""))
     .selectAll("line")
     .attr("stroke", "#e6e6e6")
     .attr("stroke-width", 0.5);

    // Axes
    g.append("g")
     .attr("transform", `translate(0,${height})`)
     .call(d3.axisBottom(xScale))
     .selectAll("text")
     .attr("transform", "rotate(-45)")
     .style("text-anchor", "end");

    g.append("g")
     .call(d3.axisLeft(yScale).ticks(8))
     .append("text")
     .attr("transform", "rotate(-90)")
     .attr("y", -50)
     .attr("x", -height / 2)
     .attr("dy", "1em")
     .attr("text-anchor", "middle")
     .attr("fill", "#333")
     .text("Temps d'attente (minutes)");

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Barres
    g.selectAll(".bar")
     .data(monthlyData)
     .enter()
     .append("rect")
     .attr("class", "bar")
     .attr("x", d => xScale(d.month))
     .attr("y", d => yScale(d.avg_waiting_time))
     .attr("width", xScale.bandwidth())
     .attr("height", d => height - yScale(d.avg_waiting_time))
     .attr("fill", "#2196F3")
     .attr("rx", 3)
     .on("mouseover", function(event, d) {
         tooltip.transition().duration(150).style("opacity", .95);
         tooltip.html(`Mois: ${d.month}<br/>Temps moyen: ${d.avg_waiting_time.toFixed(1)} min`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
     })
     .on("mouseout", function() {
         tooltip.transition().duration(200).style("opacity", 0);
     });

    // Seuils
    const thresholds = [
        { value: 30, color: "#4CAF50", label: "Bon" },
        { value: 45, color: "#FFC107", label: "Acceptable" },
        { value: 60, color: "#F44336", label: "Critique" }
    ];

    thresholds.forEach(threshold => {
        g.append("line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", yScale(threshold.value))
            .attr("y2", yScale(threshold.value))
            .attr("stroke", threshold.color)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4,4");
    });
}

function drawDoctorWaitingTimeChart(doctorsData) {
    const margin = { top: 20, right: 20, bottom: 70, left: 60 };
    const width = 1200 - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    const svg = d3.select("#waiting-time-doctor-chart");
    svg.attr("width", width + margin.left + margin.right)
       .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand().range([0, width]).padding(0.4);
    const yScale = d3.scaleLinear().range([height, 0]);

    xScale.domain(doctorsData.map(d => d.doctor_name));
    yScale.domain([0, 120]);

    // Grille
    g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale).ticks(8).tickSize(-width).tickFormat(""))
        .selectAll("line")
        .attr("stroke", "#e6e6e6")
        .attr("stroke-width", 0.5);

    // Axes
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    g.append("g")
        .call(d3.axisLeft(yScale).ticks(8))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .attr("fill", "#333")
        .text("Temps d'attente (minutes)");

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Barres colorées selon le temps d'attente
    g.selectAll(".bar")
        .data(doctorsData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.doctor_name))
        .attr("y", d => yScale(d.avg_waiting_time_per_doctor))
        .attr("width", xScale.bandwidth())
        .attr("height", d => height - yScale(d.avg_waiting_time_per_doctor))
        .attr("fill", d => {
            const time = d.avg_waiting_time_per_doctor;
            if (time <= 30) return "#4CAF50";
            if (time <= 45) return "#FFC107";
            return "#F44336";
        })
        .attr("rx", 3)
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(150).style("opacity", .95);
            tooltip.html(`${d.doctor_name}<br/>Temps moyen: ${d.avg_waiting_time_per_doctor.toFixed(1)} min`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition().duration(200).style("opacity", 0);
        });

    // Seuils
    const thresholds = [
        { value: 30, color: "#4CAF50" },
        { value: 45, color: "#FFC107" },
        { value: 60, color: "#F44336" }
    ];

    thresholds.forEach(threshold => {
        g.append("line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", yScale(threshold.value))
            .attr("y2", yScale(threshold.value))
            .attr("stroke", threshold.color)
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4,4");
    });
}
