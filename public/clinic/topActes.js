import { checkAuth } from "../utilities/utils.js";

// Graphique des top 5 actes les plus rentables
export function loadTopActes(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
    
    fetch(`/api/actes?start=${startDate}&end=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Prendre seulement le top 5
        const topData = data.slice(0, 5);
        
        // Nettoyer l'ancien graphique
        d3.select("#top-actes-chart").selectAll("*").remove();

        const margin = { top: 60, right: 100, bottom: 60, left: 280 };
        const width = 1200 - margin.left - margin.right;
        const height = 450 - margin.top - margin.bottom;

        const svg = d3.select("#top-actes-chart")
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
            .text("Top 5 des Actes les Plus Rentables");

        // Échelles
        const x = d3.scaleLinear()
            .domain([0, d3.max(topData, d => d.CA) * 1.1])
            .range([0, width]);

        const y = d3.scaleBand()
            .domain(topData.map(d => d.acte))
            .range([0, height])
            .padding(0.3);

        // Palette de couleurs dégradée
        const colorScale = d3.scaleSequential()
            .domain([0, topData.length - 1])
            .interpolator(d3.interpolateRgb("#10B981", "#059669"));

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

        // Barres horizontales
        svg.selectAll(".bar")
            .data(topData)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", 0)
            .attr("y", d => y(d.acte))
            .attr("width", 0)
            .attr("height", y.bandwidth())
            .attr("fill", (d, i) => colorScale(i))
            .attr("rx", 6)
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("opacity", 0.8);
                
                tooltip.style("visibility", "visible")
                    .html(`
                        <div style="font-weight: 600; margin-bottom: 8px; color: #10B981;">${d.acte}</div>
                        <div style="margin-bottom: 4px;"><strong>CA Total:</strong> ${d.CA.toLocaleString('fr-FR')} €</div>
                        <div style="margin-bottom: 4px;"><strong>Visites:</strong> ${d.total_visits}</div>
                        <div style="margin-bottom: 4px;"><strong>Patients:</strong> ${d.uniq_patients}</div>
                        <div><strong>CA/heure:</strong> ${d.avg_cost_per_hour.toLocaleString('fr-FR')} €</div>
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
                    .attr("opacity", 1);
                
                tooltip.style("visibility", "hidden");
            })
            .transition()
            .duration(1000)
            .attr("width", d => x(d.CA));

        // Valeurs à droite des barres
        svg.selectAll(".value-label")
            .data(topData)
            .enter().append("text")
            .attr("class", "value-label")
            .attr("x", d => x(d.CA) + 10)
            .attr("y", d => y(d.acte) + y.bandwidth() / 2)
            .attr("dy", "0.35em")
            .style("font-size", "13px")
            .style("font-weight", "600")
            .style("fill", "#059669")
            .attr("opacity", 0)
            .text(d => d.CA.toLocaleString('fr-FR') + ' €')
            .transition()
            .delay(1000)
            .duration(500)
            .attr("opacity", 1);

        // Axes
        const xAxis = svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d => d.toLocaleString('fr-FR') + ' €'))
            .style("font-size", "12px");

        const yAxis = svg.append("g")
            .call(d3.axisLeft(y))
            .style("font-size", "12px");

        // Personnaliser les labels de l'axe Y
        yAxis.selectAll("text")
            .style("font-weight", "500")
            .attr("fill", "#374151");

        // Label X
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + 45)
            .attr("text-anchor", "middle")
            .style("font-size", "13px")
            .style("fill", "#6B7280")
            .text("Chiffre d'Affaires Total (€)");

        // Médailles pour le top 3
        const medals = ["🥇", "🥈", "🥉"];
        topData.slice(0, 3).forEach((d, i) => {
            svg.append("text")
                .attr("x", -margin.left + 30)
                .attr("y", y(d.acte) + y.bandwidth() / 2)
                .attr("text-anchor", "start")
                .style("font-size", "20px")
                .text(medals[i]);
        });
    })
    .catch(error => {
        console.error('Erreur lors du chargement des actes:', error);
    });
}
