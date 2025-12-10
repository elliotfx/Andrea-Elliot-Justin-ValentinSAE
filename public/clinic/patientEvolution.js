import { checkAuth } from "../utilities/utils.js";

export function loadPatientEvolutionChart(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
    
    fetch(`/api/patient-visits?startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        drawPatientEvolutionChart(data);
    })
    .catch(error => console.error('Erreur lors de la récupération des données:', error));
}

function drawPatientEvolutionChart(data) {
    const margin = { top: 30, right: 100, bottom: 70, left: 70 };
    const width = 1200 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Nettoyer le graphique existant
    d3.select("#patient-evolution-chart").selectAll("*").remove();

    const svg = d3.select("#patient-evolution-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Préparer les données
    const processedData = data.map(d => ({
        month: d.month,
        new_patients: d.new_patient_count || 0,
        retained_patients: d.retained_patient_count || 0,
        never_returned: d.never_returned_patient_count || 0,
        cum_new: d.cumulative_new_patient_count || 0,
        cum_retained: d.cumulative_retained_patient_count || 0,
        cum_never_returned: d.cumulative_never_returned_patient_count || 0
    }));

    // Échelels
    const xScale = d3.scaleBand()
        .domain(processedData.map(d => d.month))
        .range([0, width])
        .padding(0.3);

    const yScaleLeft = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => Math.max(d.new_patients, d.retained_patients, d.never_returned))])
        .nice()
        .range([height, 0]);

    const yScaleRight = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => Math.max(d.cum_new, d.cum_retained, d.cum_never_returned))])
        .nice()
        .range([height, 0]);

    // Grille
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScaleLeft).ticks(8).tickSize(-width).tickFormat(""))
        .selectAll("line")
        .attr("stroke", "#e6e6e6")
        .attr("stroke-width", 0.5);

    // Axes
    const xAxis = svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale));

    xAxis.selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    // Axe Y gauche (barres)
    svg.append("g")
        .call(d3.axisLeft(yScaleLeft).ticks(8))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .attr("fill", "#333")
        .attr("font-size", "12px")
        .text("Nombre de visites mensuelles");

    // Axe Y droite (lignes cumulatives)
    svg.append("g")
        .attr("transform", `translate(${width}, 0)`)
        .call(d3.axisRight(yScaleRight).ticks(8))
        .append("text")
        .attr("transform", "rotate(90)")
        .attr("y", 50)
        .attr("x", height / 2)
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .attr("fill", "#333")
        .attr("font-size", "12px")
        .text("Nombre cumulatif de patients");

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Fonction pour créer les barres groupées
    const barWidth = xScale.bandwidth() / 3;

    // Barres - Nouveaux patients
    svg.selectAll(".bar-new")
        .data(processedData)
        .enter()
        .append("rect")
        .attr("class", "bar-new")
        .attr("x", d => xScale(d.month))
        .attr("y", d => yScaleLeft(d.new_patients))
        .attr("width", barWidth)
        .attr("height", d => height - yScaleLeft(d.new_patients))
        .attr("fill", "#4CAF50")
        .attr("rx", 3)
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(150).style("opacity", 0.95);
            tooltip.html(`Mois: ${d.month}<br/>Nouveaux patients: ${d.new_patients}`)
                .style("left", (event.pageX + 8) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition().duration(200).style("opacity", 0);
        });

    // Barres - Patients fidèles
    svg.selectAll(".bar-retained")
        .data(processedData)
        .enter()
        .append("rect")
        .attr("class", "bar-retained")
        .attr("x", d => xScale(d.month) + barWidth)
        .attr("y", d => yScaleLeft(d.retained_patients))
        .attr("width", barWidth)
        .attr("height", d => height - yScaleLeft(d.retained_patients))
        .attr("fill", "#2196F3")
        .attr("rx", 3)
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(150).style("opacity", 0.95);
            tooltip.html(`Mois: ${d.month}<br/>Patients fidèles: ${d.retained_patients}`)
                .style("left", (event.pageX + 8) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition().duration(200).style("opacity", 0);
        });

    // Barres - Patients jamais revenus
    svg.selectAll(".bar-never-returned")
        .data(processedData)
        .enter()
        .append("rect")
        .attr("class", "bar-never-returned")
        .attr("x", d => xScale(d.month) + barWidth * 2)
        .attr("y", d => yScaleLeft(d.never_returned))
        .attr("width", barWidth)
        .attr("height", d => height - yScaleLeft(d.never_returned))
        .attr("fill", "#FF9800")
        .attr("rx", 3)
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(150).style("opacity", 0.95);
            tooltip.html(`Mois: ${d.month}<br/>Jamais revenus: ${d.never_returned}`)
                .style("left", (event.pageX + 8) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition().duration(200).style("opacity", 0);
        });

    // Lignes cumulatives
    const lineNewCumulative = d3.line()
        .x(d => xScale(d.month) + xScale.bandwidth() / 2)
        .y(d => yScaleRight(d.cum_new));

    const lineRetainedCumulative = d3.line()
        .x(d => xScale(d.month) + xScale.bandwidth() / 2)
        .y(d => yScaleRight(d.cum_retained));

    const lineNeverReturnedCumulative = d3.line()
        .x(d => xScale(d.month) + xScale.bandwidth() / 2)
        .y(d => yScaleRight(d.cum_never_returned));

    // Ligne cumulative - Nouveaux patients
    svg.append("path")
        .datum(processedData)
        .attr("fill", "none")
        .attr("stroke", "#4CAF50")
        .attr("stroke-width", 2.5)
        .attr("stroke-dasharray", "5,5")
        .attr("d", lineNewCumulative);

    // Ligne cumulative - Patients fidèles
    svg.append("path")
        .datum(processedData)
        .attr("fill", "none")
        .attr("stroke", "#2196F3")
        .attr("stroke-width", 2.5)
        .attr("stroke-dasharray", "5,5")
        .attr("d", lineRetainedCumulative);

    // Ligne cumulative - Jamais revenus
    svg.append("path")
        .datum(processedData)
        .attr("fill", "none")
        .attr("stroke", "#FF9800")
        .attr("stroke-width", 2.5)
        .attr("stroke-dasharray", "5,5")
        .attr("d", lineNeverReturnedCumulative);

    // Ajouter les points sur les lignes
    const pointRadius = 4;

    svg.selectAll(".point-new")
        .data(processedData)
        .enter()
        .append("circle")
        .attr("class", "point-new")
        .attr("cx", d => xScale(d.month) + xScale.bandwidth() / 2)
        .attr("cy", d => yScaleRight(d.cum_new))
        .attr("r", pointRadius)
        .attr("fill", "#4CAF50")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

    svg.selectAll(".point-retained")
        .data(processedData)
        .enter()
        .append("circle")
        .attr("class", "point-retained")
        .attr("cx", d => xScale(d.month) + xScale.bandwidth() / 2)
        .attr("cy", d => yScaleRight(d.cum_retained))
        .attr("r", pointRadius)
        .attr("fill", "#2196F3")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

    svg.selectAll(".point-never-returned")
        .data(processedData)
        .enter()
        .append("circle")
        .attr("class", "point-never-returned")
        .attr("cx", d => xScale(d.month) + xScale.bandwidth() / 2)
        .attr("cy", d => yScaleRight(d.cum_never_returned))
        .attr("r", pointRadius)
        .attr("fill", "#FF9800")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

    // Légende
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 50}, 0)`);

    const legendData = [
        { label: "Nouveaux (barres)", color: "#4CAF50", type: "bar" },
        { label: "Fidèles (barres)", color: "#2196F3", type: "bar" },
        { label: "Jamais revenus (barres)", color: "#FF9800", type: "bar" },
        { label: "Cumul nouveaux (ligne)", color: "#4CAF50", type: "line" },
        { label: "Cumul fidèles (ligne)", color: "#2196F3", type: "line" },
        { label: "Cumul jamais revenus (ligne)", color: "#FF9800", type: "line" }
    ];

    legendData.forEach((item, index) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${index * 25})`);

        if (item.type === "bar") {
            legendRow.append("rect")
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", item.color)
                .attr("rx", 2);
        } else {
            legendRow.append("line")
                .attr("x1", 0)
                .attr("x2", 15)
                .attr("stroke", item.color)
                .attr("stroke-width", 2.5)
                .attr("stroke-dasharray", "5,5");
            
            legendRow.append("circle")
                .attr("cx", 7.5)
                .attr("cy", 0)
                .attr("r", 3)
                .attr("fill", item.color)
                .attr("stroke", "#fff")
                .attr("stroke-width", 1.5);
        }

        legendRow.append("text")
            .attr("x", 25)
            .attr("y", 12)
            .attr("font-size", "11px")
            .attr("fill", "#333")
            .text(item.label);
    });
}
