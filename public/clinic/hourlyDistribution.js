import { checkAuth } from "../utilities/utils.js";

// Graphique de distribution des revenus par tranches horaires (donut chart moderne)
export function loadHourlyDistribution(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
    
    fetch(`/api/hourly-revenue?start-date=${startDate}&end-date=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Regrouper par tranches horaires
        const hourGroups = [
            { label: "Matin (8h-12h)", range: [8, 9, 10, 11], color: "#FCD34D" },
            { label: "Midi (12h-14h)", range: [12, 13], color: "#FB923C" },
            { label: "Après-midi (14h-18h)", range: [14, 15, 16, 17], color: "#10B981" },
            { label: "Soirée (18h-20h)", range: [18, 19], color: "#6366F1" }
        ];

        const groupedData = hourGroups.map(group => {
            const revenue = data
                .filter(d => group.range.includes(d.visit_hour))
                .reduce((sum, d) => sum + d.total_revenue, 0);
            
            return {
                label: group.label,
                revenue: revenue,
                color: group.color
            };
        }).filter(d => d.revenue > 0); // Garder seulement les tranches avec revenus

        // Nettoyer l'ancien graphique
        d3.select("#hourly-distribution-chart").selectAll("*").remove();

        const width = 550;
        const height = 450;
        const margin = { top: 60, right: 20, bottom: 20, left: 20 };
        const radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2;

        const svg = d3.select("#hourly-distribution-chart")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);

        // Titre
        svg.append("text")
            .attr("x", 0)
            .attr("y", -height / 2 + 30)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "600")
            .style("fill", "#1F2937")
            .text("Répartition du CA par Tranches Horaires");

        // Pie generator
        const pie = d3.pie()
            .value(d => d.revenue)
            .sort(null);

        // Arc generator pour le donut
        const arc = d3.arc()
            .innerRadius(radius * 0.6)
            .outerRadius(radius * 0.9);

        const arcHover = d3.arc()
            .innerRadius(radius * 0.6)
            .outerRadius(radius * 0.95);

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

        // Calculer le total
        const totalRevenue = d3.sum(groupedData, d => d.revenue);

        // Dessiner les arcs
        const arcs = svg.selectAll(".arc")
            .data(pie(groupedData))
            .enter().append("g")
            .attr("class", "arc");

        arcs.append("path")
            .attr("d", arc)
            .attr("fill", d => d.data.color)
            .attr("stroke", "#FFFFFF")
            .attr("stroke-width", 3)
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("d", arcHover);
                
                const percentage = ((d.data.revenue / totalRevenue) * 100).toFixed(1);
                
                tooltip.style("visibility", "visible")
                    .html(`
                        <div style="font-weight: 600; margin-bottom: 6px; color: ${d.data.color};">${d.data.label}</div>
                        <div style="margin-bottom: 4px;"><strong>CA:</strong> ${d.data.revenue.toLocaleString('fr-FR')} €</div>
                        <div><strong>Part:</strong> ${percentage}%</div>
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
                    .attr("d", arc);
                
                tooltip.style("visibility", "hidden");
            })
            .transition()
            .duration(1000)
            .attrTween("d", function(d) {
                const i = d3.interpolate(d.startAngle, d.endAngle);
                return function(t) {
                    d.endAngle = i(t);
                    return arc(d);
                };
            });

        // Labels avec pourcentages
        arcs.append("text")
            .attr("transform", d => `translate(${arc.centroid(d)})`)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "600")
            .style("fill", "#FFFFFF")
            .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.5)")
            .attr("opacity", 0)
            .text(d => {
                const percentage = ((d.data.revenue / totalRevenue) * 100).toFixed(0);
                return percentage > 5 ? percentage + '%' : ''; // Afficher seulement si > 5%
            })
            .transition()
            .delay(1000)
            .duration(500)
            .attr("opacity", 1);

        // Centre du donut avec total
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "-0.5em")
            .style("font-size", "14px")
            .style("fill", "#6B7280")
            .text("Total CA");

        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "1em")
            .style("font-size", "22px")
            .style("font-weight", "700")
            .style("fill", "#1F2937")
            .text(totalRevenue.toLocaleString('fr-FR') + ' €');

        // Légende en bas
        const legendGroup = svg.append("g")
            .attr("transform", `translate(-${width / 2 - 50}, ${radius + 30})`);

        const legendItems = legendGroup.selectAll(".legend-item")
            .data(groupedData)
            .enter().append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(${(i % 2) * 250}, ${Math.floor(i / 2) * 25})`);

        legendItems.append("rect")
            .attr("width", 16)
            .attr("height", 16)
            .attr("rx", 3)
            .attr("fill", d => d.color);

        legendItems.append("text")
            .attr("x", 24)
            .attr("y", 13)
            .style("font-size", "12px")
            .style("fill", "#374151")
            .text(d => {
                const percentage = ((d.revenue / totalRevenue) * 100).toFixed(0);
                return `${d.label} (${percentage}%)`;
            });
    })
    .catch(error => {
        console.error('Erreur lors du chargement des données horaires:', error);
    });
}
