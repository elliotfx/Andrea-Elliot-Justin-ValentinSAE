import { checkAuth } from "../utilities/utils.js";

// Graphique d'évolution du CA mensuel avec area chart et tendance
export function loadRevenueEvolution(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
    
    fetch(`/api/visits-revenue?start-date=${startDate}&end-date=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Nettoyer l'ancien graphique
        d3.select("#revenue-evolution-chart").selectAll("*").remove();

        const margin = { top: 60, right: 80, bottom: 60, left: 100 };
        const width = 1200 - margin.left - margin.right;
        const height = 450 - margin.top - margin.bottom;

        const svg = d3.select("#revenue-evolution-chart")
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
            .text("Évolution du Chiffre d'Affaires Mensuel");

        // Échelles
        const x = d3.scalePoint()
            .domain(data.map(d => d.month))
            .range([0, width])
            .padding(0.5);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.revenue) * 1.1])
            .nice()
            .range([height, 0]);

        // Gradient pour l'area
        const defs = svg.append("defs");
        const gradient = defs.append("linearGradient")
            .attr("id", "area-gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#10B981")
            .attr("stop-opacity", 0.6);

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#10B981")
            .attr("stop-opacity", 0);

        // Area generator
        const area = d3.area()
            .x(d => x(d.month))
            .y0(height)
            .y1(d => y(d.revenue))
            .curve(d3.curveMonotoneX);

        // Line generator
        const line = d3.line()
            .x(d => x(d.month))
            .y(d => y(d.revenue))
            .curve(d3.curveMonotoneX);

        // Dessiner l'area
        svg.append("path")
            .datum(data)
            .attr("class", "area")
            .attr("fill", "url(#area-gradient)")
            .attr("d", area);

        // Dessiner la ligne
        svg.append("path")
            .datum(data)
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", "#10B981")
            .attr("stroke-width", 3)
            .attr("d", line);

        // Points sur la ligne
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

        svg.selectAll(".dot")
            .data(data)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.month))
            .attr("cy", d => y(d.revenue))
            .attr("r", 5)
            .attr("fill", "#10B981")
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
                        <div style="font-weight: 600; margin-bottom: 6px; color: #10B981;">${d.month}</div>
                        <div style="margin-bottom: 4px;"><strong>CA:</strong> ${d.revenue.toLocaleString('fr-FR')} €</div>
                        <div><strong>Visites:</strong> ${d.visit_count}</div>
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
            .call(d3.axisLeft(y).tickFormat(d => d.toLocaleString('fr-FR') + ' €'))
            .style("font-size", "12px");

        // Label Y
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -70)
            .attr("x", -height / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "13px")
            .style("fill", "#6B7280")
            .text("Chiffre d'Affaires (€)");

        // Calculer et afficher la variation moyenne
        if (data.length >= 2) {
            const revenueValues = data.map(d => d.revenue);
            const avgRevenue = d3.mean(revenueValues);
            const lastRevenue = revenueValues[revenueValues.length - 1];
            const variation = ((lastRevenue - avgRevenue) / avgRevenue * 100).toFixed(1);
            const variationColor = variation >= 0 ? "#10B981" : "#EF4444";
            const variationIcon = variation >= 0 ? "↗" : "↘";

            svg.append("text")
                .attr("x", width - 10)
                .attr("y", -10)
                .attr("text-anchor", "end")
                .style("font-size", "14px")
                .style("font-weight", "600")
                .style("fill", variationColor)
                .text(`${variationIcon} ${Math.abs(variation)}% vs moyenne`);
        }
    })
    .catch(error => {
        console.error('Erreur lors du chargement des données:', error);
    });
}
