import { checkAuth } from "../utilities/utils.js";

// Graphique des revenus par médecin avec comparaison
export function loadDoctorRevenue(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
    
    fetch(`/api/medecins?startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Prendre les 6 premiers médecins pour une meilleure lisibilité
        const topDoctors = data.slice(0, 6).map(d => ({
            medecin: `${d.firstName} ${d.lastName}`,
            CA: d.Montant,
            consultations: d.Consultations,
            cost_per_consultation: d.cout_par_consultation,
            total_hours: d.total_hours,
            hourly_rate: d.tarif_par_heure
        }));
        
        // Nettoyer l'ancien graphique
        d3.select("#doctor-revenue-chart").selectAll("*").remove();

        const margin = { top: 60, right: 120, bottom: 80, left: 120 };
        const width = 1200 - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        const svg = d3.select("#doctor-revenue-chart")
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
            .text("Performance Financière des Médecins");

        // Échelles
        const x = d3.scaleBand()
            .domain(topDoctors.map(d => d.medecin))
            .range([0, width])
            .padding(0.3);

        const y = d3.scaleLinear()
            .domain([0, d3.max(topDoctors, d => d.CA) * 1.15])
            .nice()
            .range([height, 0]);

        // Échelle de couleurs dégradée
        const colorScale = d3.scaleLinear()
            .domain([0, topDoctors.length - 1])
            .range(["#3B82F6", "#8B5CF6"]);

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

        // Barres avec gradient
        const defs = svg.append("defs");
        
        topDoctors.forEach((d, i) => {
            const gradient = defs.append("linearGradient")
                .attr("id", `gradient-${i}`)
                .attr("x1", "0%")
                .attr("y1", "100%")
                .attr("x2", "0%")
                .attr("y2", "0%");

            const color = colorScale(i);
            gradient.append("stop")
                .attr("offset", "0%")
                .attr("stop-color", color)
                .attr("stop-opacity", 0.7);

            gradient.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", color)
                .attr("stop-opacity", 1);
        });

        // Dessiner les barres
        svg.selectAll(".bar")
            .data(topDoctors)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.medecin))
            .attr("y", height)
            .attr("width", x.bandwidth())
            .attr("height", 0)
            .attr("fill", (d, i) => `url(#gradient-${i})`)
            .attr("rx", 6)
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("opacity", 0.8);
                
                tooltip.style("visibility", "visible")
                    .html(`
                        <div style="font-weight: 600; margin-bottom: 8px; color: #3B82F6;">${d.medecin}</div>
                        <div style="margin-bottom: 4px;"><strong>CA Total:</strong> ${d.CA.toLocaleString('fr-FR')} €</div>
                        <div style="margin-bottom: 4px;"><strong>Consultations:</strong> ${d.consultations}</div>
                        <div style="margin-bottom: 4px;"><strong>CA/consultation:</strong> ${d.cost_per_consultation.toLocaleString('fr-FR')} €</div>
                        <div style="margin-bottom: 4px;"><strong>Heures travaillées:</strong> ${parseFloat(d.total_hours).toFixed(1)}h</div>
                        <div><strong>Tarif/heure:</strong> ${d.hourly_rate.toLocaleString('fr-FR')} €</div>
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
            .delay((d, i) => i * 100)
            .attr("y", d => y(d.CA))
            .attr("height", d => height - y(d.CA));

        // Valeurs au-dessus des barres
        svg.selectAll(".value-label")
            .data(topDoctors)
            .enter().append("text")
            .attr("class", "value-label")
            .attr("x", d => x(d.medecin) + x.bandwidth() / 2)
            .attr("y", d => y(d.CA) - 10)
            .attr("text-anchor", "middle")
            .style("font-size", "13px")
            .style("font-weight", "600")
            .style("fill", "#3B82F6")
            .attr("opacity", 0)
            .text(d => d.CA.toLocaleString('fr-FR') + ' €')
            .transition()
            .delay(1200)
            .duration(500)
            .attr("opacity", 1);

        // Ligne de moyenne
        const avgRevenue = d3.mean(topDoctors, d => d.CA);
        
        svg.append("line")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", y(avgRevenue))
            .attr("y2", y(avgRevenue))
            .attr("stroke", "#EF4444")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "8,4")
            .attr("opacity", 0)
            .transition()
            .delay(1500)
            .duration(500)
            .attr("opacity", 0.7);

        svg.append("text")
            .attr("x", width + 10)
            .attr("y", y(avgRevenue))
            .attr("dy", "0.35em")
            .style("font-size", "12px")
            .style("font-weight", "600")
            .style("fill", "#EF4444")
            .attr("opacity", 0)
            .text(`Moyenne: ${avgRevenue.toLocaleString('fr-FR')} €`)
            .transition()
            .delay(1500)
            .duration(500)
            .attr("opacity", 1);

        // Axes
        const xAxis = svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .style("font-size", "12px");

        xAxis.selectAll("text")
            .attr("transform", "rotate(-20)")
            .style("text-anchor", "end")
            .style("font-weight", "500");

        const yAxis = svg.append("g")
            .call(d3.axisLeft(y).tickFormat(d => d.toLocaleString('fr-FR') + ' €'))
            .style("font-size", "12px");

        // Labels
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -80)
            .attr("x", -height / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "13px")
            .style("fill", "#6B7280")
            .text("Chiffre d'Affaires (€)");

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + 60)
            .attr("text-anchor", "middle")
            .style("font-size", "13px")
            .style("fill", "#6B7280")
            .text("Médecins");

        // Icônes de performance
        topDoctors.forEach((d, i) => {
            if (i === 0) {
                // Meilleur performer - étoile
                svg.append("text")
                    .attr("x", x(d.medecin) + x.bandwidth() / 2)
                    .attr("y", y(d.CA) - 35)
                    .attr("text-anchor", "middle")
                    .style("font-size", "24px")
                    .text("⭐")
                    .attr("opacity", 0)
                    .transition()
                    .delay(1800)
                    .duration(500)
                    .attr("opacity", 1);
            }
        });
    })
    .catch(error => {
        console.error('Erreur lors du chargement des données des médecins:', error);
    });
}
