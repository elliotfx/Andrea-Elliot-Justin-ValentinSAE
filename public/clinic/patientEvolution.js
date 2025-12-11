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
        drawPatientRetentionChart(data);
        drawPatientFlowChart(data);
    })
    .catch(error => console.error('Erreur lors de la récupération des données:', error));
}

function drawPatientEvolutionChart(data) {
    const margin = { top: 40, right: 150, bottom: 80, left: 80 };
    const width = 1200 - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;

    // Nettoyer le graphique existant
    d3.select("#patient-evolution-chart").selectAll("*").remove();

    const svg = d3.select("#patient-evolution-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    // Ajouter un fond blanc
    svg.append("rect")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("fill", "#ffffff");

    const g = svg.append("g")
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
        .padding(0.25);

    const yScaleLeft = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => Math.max(d.new_patients, d.retained_patients, d.never_returned)) * 1.15])
        .nice()
        .range([height, 0]);

    const yScaleRight = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => Math.max(d.cum_new, d.cum_retained, d.cum_never_returned)) * 1.1])
        .nice()
        .range([height, 0]);

    // Grille avec style amélioré
    g.append("g")
        .attr("class", "grid")
        .attr("opacity", 0.1)
        .call(d3.axisLeft(yScaleLeft).ticks(10).tickSize(-width).tickFormat(""))
        .selectAll("line")
        .attr("stroke", "#000")
        .attr("stroke-width", 1);

    // Axes avec meilleur style
    const xAxis = g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .attr("font-size", "12px");

    xAxis.selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("dy", "0.5em");

    // Axe Y gauche
    g.append("g")
        .call(d3.axisLeft(yScaleLeft).ticks(10))
        .attr("font-size", "12px")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -65)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .attr("fill", "#333")
        .attr("font-size", "13px")
        .attr("font-weight", "bold")
        .text("Nombre mensuel de patients");

    // Axe Y droite
    g.append("g")
        .attr("transform", `translate(${width}, 0)`)
        .call(d3.axisRight(yScaleRight).ticks(10))
        .attr("font-size", "12px")
        .append("text")
        .attr("transform", "rotate(90)")
        .attr("y", 65)
        .attr("x", height / 2)
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .attr("fill", "#333")
        .attr("font-size", "13px")
        .attr("font-weight", "bold")
        .text("Cumul de patients");

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(0, 0, 0, 0.8)")
        .style("color", "#fff")
        .style("padding", "8px 12px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("z-index", "1000");

    // Fonction pour créer les barres groupées
    const barWidth = xScale.bandwidth() / 3;

    // Barres - Nouveaux patients
    g.selectAll(".bar-new")
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
        .attr("opacity", 0.85)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("opacity", 1)
                .attr("filter", "drop-shadow(0 0 3px rgba(76, 175, 80, 0.5))");
            tooltip.transition().duration(150).style("opacity", 0.95);
            tooltip.html(`<strong>Mois: ${d.month}</strong><br/>Nouveaux patients: ${d.new_patients}`)
                .style("left", (event.pageX + 8) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("opacity", 0.85)
                .attr("filter", "none");
            tooltip.transition().duration(200).style("opacity", 0);
        });

    // Barres - Patients fidèles
    g.selectAll(".bar-retained")
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
        .attr("opacity", 0.85)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("opacity", 1)
                .attr("filter", "drop-shadow(0 0 3px rgba(33, 150, 243, 0.5))");
            tooltip.transition().duration(150).style("opacity", 0.95);
            tooltip.html(`<strong>Mois: ${d.month}</strong><br/>Patients fidèles: ${d.retained_patients}`)
                .style("left", (event.pageX + 8) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("opacity", 0.85)
                .attr("filter", "none");
            tooltip.transition().duration(200).style("opacity", 0);
        });

    // Barres - Patients jamais revenus
    g.selectAll(".bar-never-returned")
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
        .attr("opacity", 0.85)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("opacity", 1)
                .attr("filter", "drop-shadow(0 0 3px rgba(255, 152, 0, 0.5))");
            tooltip.transition().duration(150).style("opacity", 0.95);
            tooltip.html(`<strong>Mois: ${d.month}</strong><br/>Jamais revenus: ${d.never_returned}`)
                .style("left", (event.pageX + 8) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("opacity", 0.85)
                .attr("filter", "none");
            tooltip.transition().duration(200).style("opacity", 0);
        });

    // Lignes cumulatives avec meilleur style
    const lineNewCumulative = d3.line()
        .x(d => xScale(d.month) + xScale.bandwidth() / 2)
        .y(d => yScaleRight(d.cum_new))
        .curve(d3.curveMonotoneX);

    const lineRetainedCumulative = d3.line()
        .x(d => xScale(d.month) + xScale.bandwidth() / 2)
        .y(d => yScaleRight(d.cum_retained))
        .curve(d3.curveMonotoneX);

    const lineNeverReturnedCumulative = d3.line()
        .x(d => xScale(d.month) + xScale.bandwidth() / 2)
        .y(d => yScaleRight(d.cum_never_returned))
        .curve(d3.curveMonotoneX);

    // Ajouter les chemins des lignes avec animations
    g.append("path")
        .datum(processedData)
        .attr("fill", "none")
        .attr("stroke", "#4CAF50")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "5,5")
        .attr("opacity", 0.8)
        .attr("d", lineNewCumulative);

    g.append("path")
        .datum(processedData)
        .attr("fill", "none")
        .attr("stroke", "#2196F3")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "5,5")
        .attr("opacity", 0.8)
        .attr("d", lineRetainedCumulative);

    g.append("path")
        .datum(processedData)
        .attr("fill", "none")
        .attr("stroke", "#FF9800")
        .attr("stroke-width", 3)
        .attr("stroke-dasharray", "5,5")
        .attr("opacity", 0.8)
        .attr("d", lineNeverReturnedCumulative);

    // Ajouter les points sur les lignes avec meilleur style
    const pointRadius = 5;

    svg.selectAll(".point-new")
        .data(processedData)
        .enter()
        .append("circle")
        .attr("class", "point-new")
        .attr("cx", d => margin.left + xScale(d.month) + xScale.bandwidth() / 2)
        .attr("cy", d => margin.top + yScaleRight(d.cum_new))
        .attr("r", pointRadius)
        .attr("fill", "#4CAF50")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2.5)
        .attr("filter", "drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2))");

    svg.selectAll(".point-retained")
        .data(processedData)
        .enter()
        .append("circle")
        .attr("class", "point-retained")
        .attr("cx", d => margin.left + xScale(d.month) + xScale.bandwidth() / 2)
        .attr("cy", d => margin.top + yScaleRight(d.cum_retained))
        .attr("r", pointRadius)
        .attr("fill", "#2196F3")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2.5)
        .attr("filter", "drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2))");

    svg.selectAll(".point-never-returned")
        .data(processedData)
        .enter()
        .append("circle")
        .attr("class", "point-never-returned")
        .attr("cx", d => margin.left + xScale(d.month) + xScale.bandwidth() / 2)
        .attr("cy", d => margin.top + yScaleRight(d.cum_never_returned))
        .attr("r", pointRadius)
        .attr("fill", "#FF9800")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2.5)
        .attr("filter", "drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2))");

    // Légende avec meilleur style
    const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 60}, 0)`);

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
            .attr("transform", `translate(0, ${index * 28})`)
            .attr("cursor", "pointer")
            .on("mouseover", function() {
                d3.select(this).attr("opacity", 0.7);
            })
            .on("mouseout", function() {
                d3.select(this).attr("opacity", 1);
            });

        if (item.type === "bar") {
            legendRow.append("rect")
                .attr("width", 18)
                .attr("height", 18)
                .attr("fill", item.color)
                .attr("rx", 3)
                .attr("opacity", 0.85);
        } else {
            legendRow.append("line")
                .attr("x1", 0)
                .attr("x2", 18)
                .attr("stroke", item.color)
                .attr("stroke-width", 3)
                .attr("stroke-dasharray", "5,5")
                .attr("opacity", 0.8);
            
            legendRow.append("circle")
                .attr("cx", 9)
                .attr("cy", 0)
                .attr("r", 3.5)
                .attr("fill", item.color)
                .attr("stroke", "#fff")
                .attr("stroke-width", 1.5);
        }

        legendRow.append("text")
            .attr("x", 28)
            .attr("y", 14)
            .attr("font-size", "12px")
            .attr("fill", "#333")
            .attr("font-weight", "500")
            .text(item.label);
    });
}

function drawPatientRetentionChart(data) {
    const margin = { top: 30, right: 140, bottom: 80, left: 80 };
    const width = 1100 - margin.left - margin.right;
    const height = 420 - margin.top - margin.bottom;

    d3.select("#patient-retention-chart").selectAll("*").remove();

    const svg = d3.select("#patient-retention-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Répartition mensuelle en pourcentage (100%) des catégories patients
    const processed = data.map(d => {
        const newP = d.new_patient_count || 0;
        const ret = d.retained_patient_count || 0;
        const lost = d.never_returned_patient_count || 0;
        const total = Math.max(newP + ret + lost, 1);
        return {
            month: d.month,
            new_share: (newP / total) * 100,
            retained_share: (ret / total) * 100,
            lost_share: (lost / total) * 100
        };
    });

    const x = d3.scaleBand()
        .domain(processed.map(d => d.month))
        .range([0, width])
        .padding(0.25);

    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);

    // Grille
    g.append("g")
        .attr("class", "grid")
        .attr("opacity", 0.12)
        .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""))
        .selectAll("line")
        .attr("stroke", "#000")
        .attr("stroke-width", 1);

    // Axes
    const xAxis = g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .attr("font-size", "11px");

    xAxis.selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("dy", "0.5em");

    g.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d}%`))
        .attr("font-size", "11px")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -48)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .attr("fill", "#333")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .text("Part mensuelle des patients");

    // Stack 100% sur trois catégories
    const stack = d3.stack()
        .keys(["new_share", "retained_share", "lost_share"])
        .offset(d3.stackOffsetExpand);

    const stackedData = stack(processed);
    const color = d3.scaleOrdinal()
        .domain(["new_share", "retained_share", "lost_share"])
        .range(["#4CAF50", "#2196F3", "#FF9800"]);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(0, 0, 0, 0.85)")
        .style("color", "#fff")
        .style("padding", "8px 12px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("z-index", "1000");

    // Barres 100% empilées
    g.selectAll(".layer")
        .data(stackedData)
        .enter()
        .append("g")
        .attr("fill", d => color(d.key))
        .selectAll("rect")
        .data(d => d)
        .enter()
        .append("rect")
        .attr("x", d => x(d.data.month))
        .attr("y", d => y(d[1] * 100))
        .attr("height", d => y(d[0] * 100) - y(d[1] * 100))
        .attr("width", x.bandwidth())
        .attr("opacity", 0.9)
        .on("mousemove", function(event, d) {
            const month = d.data.month;
            const newP = d.data.new_share;
            const retP = d.data.retained_share;
            const lostP = d.data.lost_share;
            tooltip.transition().duration(80).style("opacity", 0.95);
            tooltip.html(`
                <strong>${month}</strong><br/>
                Nouveaux: ${newP.toFixed(1)}%<br/>
                Fidèles: ${retP.toFixed(1)}%<br/>
                Jamais revenus: ${lostP.toFixed(1)}%
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 40) + "px");
        })
        .on("mouseout", () => tooltip.transition().duration(120).style("opacity", 0));

    // Légende
    const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 25}, 0)`);

    const legendData = [
        { label: "Nouveaux", color: "#4CAF50" },
        { label: "Fidèles", color: "#2196F3" },
        { label: "Jamais revenus", color: "#FF9800" }
    ];

    legendData.forEach((item, index) => {
        const row = legend.append("g")
            .attr("transform", `translate(0, ${index * 22})`);

        row.append("rect")
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", item.color)
            .attr("opacity", 0.9);

        row.append("text")
            .attr("x", 22)
            .attr("y", 11)
            .attr("font-size", "11.5px")
            .attr("fill", "#333")
            .text(item.label);
    });
}

// Nouveau graphique : flux mensuel (comptes absolus)
function drawPatientFlowChart(data) {
    const margin = { top: 30, right: 140, bottom: 80, left: 80 };
    const width = 1100 - margin.left - margin.right;
    const height = 420 - margin.top - margin.bottom;

    d3.select("#patient-flow-chart").selectAll("*").remove();

    const svg = d3.select("#patient-flow-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const processed = data.map(d => ({
        month: d.month,
        new_count: d.new_patient_count || 0,
        retained_count: d.retained_patient_count || 0,
        lost_count: d.never_returned_patient_count || 0
    }));

    const x = d3.scaleBand()
        .domain(processed.map(d => d.month))
        .range([0, width])
        .padding(0.25);

    const maxY = d3.max(processed, d => Math.max(d.new_count, d.retained_count, d.lost_count)) || 0;
    const y = d3.scaleLinear()
        .domain([0, Math.max(1, maxY * 1.1)])
        .nice()
        .range([height, 0]);

    // Grille
    g.append("g")
        .attr("class", "grid")
        .attr("opacity", 0.1)
        .call(d3.axisLeft(y).ticks(8).tickSize(-width).tickFormat(""))
        .selectAll("line")
        .attr("stroke", "#000")
        .attr("stroke-width", 1);

    // Axes
    const xAxis = g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .attr("font-size", "11px");

    xAxis.selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .attr("dy", "0.5em");

    g.append("g")
        .call(d3.axisLeft(y).ticks(8))
        .attr("font-size", "11px")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -55)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .attr("fill", "#333")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .text("Nombre de patients");

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "rgba(0, 0, 0, 0.85)")
        .style("color", "#fff")
        .style("padding", "8px 12px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("z-index", "1000");

    const barWidth = x.bandwidth() / 3;

    const drawBars = (cls, accessor, color, label, offset) => {
        g.selectAll(`.${cls}`)
            .data(processed)
            .enter()
            .append("rect")
            .attr("class", cls)
            .attr("x", d => x(d.month) + offset)
            .attr("y", d => y(accessor(d)))
            .attr("width", barWidth)
            .attr("height", d => height - y(accessor(d)))
            .attr("fill", color)
            .attr("rx", 3)
            .attr("opacity", 0.9)
            .on("mouseover", function(event, d) {
                tooltip.transition().duration(100).style("opacity", 0.95);
                tooltip.html(`<strong>${d.month}</strong><br/>${label}: ${accessor(d)}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 40) + "px");
            })
            .on("mouseout", () => tooltip.transition().duration(120).style("opacity", 0));
    };

    drawBars("bar-new-count", d => d.new_count, "#4CAF50", "Nouveaux", 0);
    drawBars("bar-retained-count", d => d.retained_count, "#2196F3", "Fidèles", barWidth);
    drawBars("bar-lost-count", d => d.lost_count, "#FF9800", "Jamais revenus", barWidth * 2);

    // Légende
    const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 25}, 0)`);

    const legendData = [
        { label: "Nouveaux", color: "#4CAF50" },
        { label: "Fidèles", color: "#2196F3" },
        { label: "Jamais revenus", color: "#FF9800" }
    ];

    legendData.forEach((item, index) => {
        const row = legend.append("g")
            .attr("transform", `translate(0, ${index * 22})`);

        row.append("rect")
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", item.color)
            .attr("opacity", 0.9);

        row.append("text")
            .attr("x", 22)
            .attr("y", 11)
            .attr("font-size", "11.5px")
            .attr("fill", "#333")
            .text(item.label);
    });
}
