// actesDonutChart.js - Graphique Donut pour la répartition des actes

export function updateActesDonutChart(actesData) {
    console.log("updateActesDonutChart appelé avec:", actesData);
    
    // Effacer le graphique existant
    const svg = d3.select("#actes-donut-chart");
    svg.selectAll("*").remove();

    if (!actesData || actesData.length === 0) {
        console.log("Pas de données pour le donut chart");
        svg.attr("width", 450)
           .attr("height", 320);
        svg.append("text")
            .attr("x", 225)
            .attr("y", 160)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("fill", "#666")
            .text("Aucune donnée disponible");
        return;
    }
    
    console.log("Nombre d'actes:", actesData.length);
    console.log("Premier acte:", actesData[0]);

    // Configuration des dimensions
    const width = 450;
    const height = 320;
    const margin = 20;
    const radius = Math.min(width - 150, height) / 2 - margin; // Réduire pour laisser place à la légende
    const innerRadius = radius * 0.5; // Taille du trou central pour le donut

    // Configurer le SVG
    svg.attr("width", width)
       .attr("height", height)
       .attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g")
        .attr("transform", `translate(${(width - 150) / 2}, ${height / 2})`);

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
        .attr("dy", "-0.3em")
        .style("font-size", "12px")
        .style("fill", "#666")
        .text("Total actes");

    g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.9em")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .style("fill", "#333")
        .text(total.toLocaleString('fr-FR'));

    // Légende
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 145}, 15)`);

    const legendItems = legend.selectAll(".legend-item")
        .data(chartData)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 18})`);

    legendItems.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("rx", 2)
        .attr("fill", d => color(d.acte));

    legendItems.append("text")
        .attr("x", 16)
        .attr("y", 10)
        .style("font-size", "10px")
        .style("fill", "#333")
        .text(d => {
            const label = d.acte.length > 15 ? d.acte.substring(0, 15) + "..." : d.acte;
            const percentage = ((d.value / total) * 100).toFixed(1);
            return `${label} (${percentage}%)`;
        });
}
