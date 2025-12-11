// actesDonutChart.js - Graphique Donut pour la répartition des actes

export function updateActesDonutChart(actesData) {
    // Effacer le graphique existant
    const svg = d3.select("#actes-donut-chart");
    svg.selectAll("*").remove();

    if (!actesData || actesData.length === 0) {
        svg.append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("text-anchor", "middle")
            .text("Aucune donnée disponible");
        return;
    }

    // Configuration des dimensions
    const width = 800;
    const height = 500;
    const margin = 40;
    const radius = Math.min(width, height) / 2 - margin;
    const innerRadius = radius * 0.5; // Taille du trou central pour le donut

    // Configurer le SVG
    svg.attr("width", width)
       .attr("height", height)
       .attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g")
        .attr("transform", `translate(${width / 2 - 100}, ${height / 2})`);

    // Préparer les données - utiliser le nombre d'actes (totalActs)
    const total = d3.sum(actesData, d => d.totalActs || 0);
    
    // Trier par nombre d'actes et prendre les top 10, regrouper le reste en "Autres"
    const sortedData = [...actesData].sort((a, b) => (b.totalActs || 0) - (a.totalActs || 0));
    let chartData;
    
    if (sortedData.length > 10) {
        const top10 = sortedData.slice(0, 10);
        const others = sortedData.slice(10);
        const othersTotal = d3.sum(others, d => d.totalActs || 0);
        
        chartData = [
            ...top10.map(d => ({ acte: d.acte, value: d.totalActs || 0 })),
            { acte: "Autres", value: othersTotal }
        ];
    } else {
        chartData = sortedData.map(d => ({ acte: d.acte, value: d.totalActs || 0 }));
    }

    // Palette de couleurs
    const color = d3.scaleOrdinal()
        .domain(chartData.map(d => d.acte))
        .range([
            "#667eea", "#764ba2", "#4A90E2", "#50C878", "#FF6B6B",
            "#FFA500", "#9B59B6", "#3498DB", "#1ABC9C", "#E74C3C",
            "#95A5A6"
        ]);

    // Créer le générateur de pie
    const pie = d3.pie()
        .value(d => d.value)
        .sort(null)
        .padAngle(0.02);

    // Créer le générateur d'arc
    const arc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(radius);

    // Arc pour l'animation hover
    const arcHover = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(radius + 10);

    // Tooltip
    const tooltip = d3.select("body").selectAll(".donut-tooltip").data([0]);
    const tooltipEnter = tooltip.enter()
        .append("div")
        .attr("class", "donut-tooltip tooltip")
        .style("opacity", 0);
    const tooltipDiv = tooltip.merge(tooltipEnter);

    // Dessiner les arcs
    const arcs = g.selectAll(".arc")
        .data(pie(chartData))
        .enter()
        .append("g")
        .attr("class", "arc");

    arcs.append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.acte))
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("d", arcHover);

            const percentage = ((d.data.value / total) * 100).toFixed(1);
            tooltipDiv.transition()
                .duration(200)
                .style("opacity", 0.9);
            tooltipDiv.html(`
                <strong>${d.data.acte}</strong><br/>
                Actes: ${d.data.value}<br/>
                Pourcentage: ${percentage}%
            `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("d", arc);

            tooltipDiv.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Texte central avec le total
    g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "-0.5em")
        .style("font-size", "16px")
        .style("fill", "#666")
        .text("Total actes");

    g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "1em")
        .style("font-size", "28px")
        .style("font-weight", "bold")
        .style("fill", "#333")
        .text(total.toLocaleString('fr-FR'));

    // Légende
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 200}, 30)`);

    const legendItems = legend.selectAll(".legend-item")
        .data(chartData)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 22})`);

    legendItems.append("rect")
        .attr("width", 16)
        .attr("height", 16)
        .attr("rx", 3)
        .attr("fill", d => color(d.acte));

    legendItems.append("text")
        .attr("x", 22)
        .attr("y", 12)
        .style("font-size", "12px")
        .style("fill", "#333")
        .text(d => {
            const label = d.acte.length > 20 ? d.acte.substring(0, 20) + "..." : d.acte;
            const percentage = ((d.value / total) * 100).toFixed(1);
            return `${label} (${percentage}%)`;
        });
}
