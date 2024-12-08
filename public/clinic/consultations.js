import { checkAuth } from "../utilities/utils.js";

// Fonction pour mettre à jour le graphique des consultations
export function updateConsultationsChart(month) {
    checkAuth();
    const token = localStorage.getItem('token');

    d3.json(`/api/consultations?month=${month}`)
        .header('Authorization', `Bearer ${token}`) // Ajouter le token JWT dans l'en-tête
        .then(data => {
            const margin = { top: 30, right: 70, bottom: 50, left: 70 };
            const width = 1000 - margin.left - margin.right;
            const height = 400 - margin.top - margin.bottom;

            const svg = d3.select("#consultations-chart");
            svg.selectAll("*").remove(); // Effacer le contenu précédent

            const chart = svg
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const x = d3.scaleBand()
                .domain(data.map(d => `${d.doctor_first_name} ${d.doctor_last_name}`))
                .range([0, width])
                .padding(0.2);

            const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.consultation_count)])
                .nice()
                .range([height, 0]);

            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip");

            chart.selectAll(".bar")
                .data(data)
                .enter().append("rect")
                .attr("class", "bar")
                .attr("x", d => x(`${d.doctor_first_name} ${d.doctor_last_name}`))
                .attr("y", d => y(d.consultation_count))
                .attr("width", x.bandwidth())
                .attr("height", d => height - y(d.consultation_count))
                .on("mouseover", function(event, d) {
                    tooltip.transition().duration(200).style("opacity", .9);
                    tooltip.html(`Consultations: ${d.consultation_count}`)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function(d) {
                    tooltip.transition().duration(500).style("opacity", 0);
                });

            chart.append("g")
                .attr("class", "x-axis")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x))
                .selectAll("text")
                .attr("transform", "rotate(-45)")
                .style("text-anchor", "end");

            chart.append("g")
                .attr("class", "y-axis")
                .call(d3.axisLeft(y));
        })
        .catch(error => console.error('Erreur lors de la récupération des données:', error));
}
