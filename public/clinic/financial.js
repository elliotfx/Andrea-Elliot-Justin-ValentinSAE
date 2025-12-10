import { checkAuth } from "../utilities/utils.js";

export function loadFinancialChart(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
    
    fetch(`/api/visits-revenue?startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        drawFinancialChart(data);
    })
    .catch(error => console.error('Erreur lors de la récupération des données:', error));
}

function drawFinancialChart(data) {
    const margin = { top: 30, right: 100, bottom: 70, left: 70 };
    const width = 1200 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Nettoyer le graphique existant
    d3.select("#financial-chart").selectAll("*").remove();

    const svg = d3.select("#financial-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Préparer les données
    const processedData = data.map(d => ({
        month: d.month,
        total_revenue: parseFloat(d.total_revenue) || 0,
        avg_revenue_per_visit: parseFloat(d.avg_revenue_per_visit) || 0,
        num_visits: parseInt(d.num_visits) || 0
    })).sort((a, b) => new Date(a.month + '-01') - new Date(b.month + '-01'));

    // Calculer les cumuls
    let cumRevenue = 0;
    const finalData = processedData.map(d => {
        cumRevenue += d.total_revenue;
        return {
            ...d,
            cum_revenue: cumRevenue
        };
    });

    // Échelels
    const xScale = d3.scaleBand()
        .domain(finalData.map(d => d.month))
        .range([0, width])
        .padding(0.3);

    const yScaleLeft = d3.scaleLinear()
        .domain([0, d3.max(finalData, d => Math.max(d.total_revenue, d.avg_revenue_per_visit * 1000))])
        .nice()
        .range([height, 0]);

    const yScaleRight = d3.scaleLinear()
        .domain([0, d3.max(finalData, d => d.cum_revenue)])
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

    // Axe Y gauche
    svg.append("g")
        .call(d3.axisLeft(yScaleLeft).ticks(8).tickFormat(d => `${(d / 1000).toFixed(0)}k`))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -50)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .attr("fill", "#333")
        .attr("font-size", "12px")
        .text("Chiffre d'affaires (DA)");

    // Axe Y droite
    svg.append("g")
        .attr("transform", `translate(${width}, 0)`)
        .call(d3.axisRight(yScaleRight).ticks(8).tickFormat(d => `${(d / 1000).toFixed(0)}k`))
        .append("text")
        .attr("transform", "rotate(90)")
        .attr("y", 50)
        .attr("x", height / 2)
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .attr("fill", "#333")
        .attr("font-size", "12px")
        .text("Cumul (DA)");

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    const barWidth = xScale.bandwidth() / 2;

    // Barres - Chiffre d'affaires
    svg.selectAll(".bar-revenue")
        .data(finalData)
        .enter()
        .append("rect")
        .attr("class", "bar-revenue")
        .attr("x", d => xScale(d.month))
        .attr("y", d => yScaleLeft(d.total_revenue))
        .attr("width", barWidth)
        .attr("height", d => height - yScaleLeft(d.total_revenue))
        .attr("fill", "#FF9800")
        .attr("rx", 3)
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(150).style("opacity", 0.95);
            tooltip.html(`Mois: ${d.month}<br/>CA: ${d.total_revenue.toFixed(2)} DA`)
                .style("left", (event.pageX + 8) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition().duration(200).style("opacity", 0);
        });

    // Barres - Revenu moyen par visite
    svg.selectAll(".bar-avg-revenue")
        .data(finalData)
        .enter()
        .append("rect")
        .attr("class", "bar-avg-revenue")
        .attr("x", d => xScale(d.month) + barWidth)
        .attr("y", d => yScaleLeft(d.avg_revenue_per_visit * 1000))
        .attr("width", barWidth)
        .attr("height", d => height - yScaleLeft(d.avg_revenue_per_visit * 1000))
        .attr("fill", "#4CAF50")
        .attr("rx", 3)
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(150).style("opacity", 0.95);
            tooltip.html(`Mois: ${d.month}<br/>Revenu/visite: ${d.avg_revenue_per_visit.toFixed(2)} DA`)
                .style("left", (event.pageX + 8) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition().duration(200).style("opacity", 0);
        });

    // Ligne cumulative
    const lineCumRevenue = d3.line()
        .x(d => xScale(d.month) + xScale.bandwidth() / 2)
        .y(d => yScaleRight(d.cum_revenue));

    svg.append("path")
        .datum(finalData)
        .attr("fill", "none")
        .attr("stroke", "#FF9800")
        .attr("stroke-width", 2.5)
        .attr("stroke-dasharray", "5,5")
        .attr("d", lineCumRevenue);

    // Points sur la ligne
    const pointRadius = 4;

    svg.selectAll(".point-cum-revenue")
        .data(finalData)
        .enter()
        .append("circle")
        .attr("class", "point-cum-revenue")
        .attr("cx", d => xScale(d.month) + xScale.bandwidth() / 2)
        .attr("cy", d => yScaleRight(d.cum_revenue))
        .attr("r", pointRadius)
        .attr("fill", "#FF9800")
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

    // Légende
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 50}, 0)`);

    const legendData = [
        { label: "CA Total (barres)", color: "#FF9800", type: "bar" },
        { label: "Revenu/visite (barres)", color: "#4CAF50", type: "bar" },
        { label: "Cumul CA (ligne)", color: "#FF9800", type: "line" }
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
