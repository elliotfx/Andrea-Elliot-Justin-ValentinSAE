import { checkAuth } from "../utilities/utils.js";


function drawStackedBarChart(data) {
    const svg = d3.select("#stacked-bar-chart");
    const margin = { top: 30, right: 20, bottom: 70, left: 70 };
    const width = 900 - margin.left - margin.right;
    const height = 420 - margin.top - margin.bottom;

    // Clear previous
    svg.selectAll("*").remove();

    svg.attr("width", width + margin.left + margin.right)
       .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left},${margin.top})`);

    const parsed = data.map(d => ({
        mois_prise: d.mois_prise,
        rendezvous_meme_mois: Number(d.rendezvous_meme_mois) || 0,
        rendezvous_mois_suivants: Number(d.rendezvous_mois_suivants) || 0
    }));

    const xScale = d3.scaleBand().range([0, width]).padding(0.35);
    const yScale = d3.scaleLinear().range([height, 0]);

    const color = d3.scaleOrdinal()
                    .domain(["rendezvous_meme_mois", "rendezvous_mois_suivants"])
                    .range(["#4CAF50", "#FFC107"]);

    const stackedData = d3.stack()
        .keys(["rendezvous_meme_mois", "rendezvous_mois_suivants"])
        (parsed);

    xScale.domain(parsed.map(d => d.mois_prise));
    const maxY = d3.max(stackedData[stackedData.length - 1], d => d[1]) || 1;
    yScale.domain([0, maxY * 1.1]).nice();

    // Grid
    g.append("g")
     .attr("class", "grid")
     .call(d3.axisLeft(yScale).ticks(6).tickSize(-width).tickFormat(""))
     .selectAll("line")
     .attr("stroke", "#e6e6e6");

    // Axes
    g.append("g")
     .attr("transform", `translate(0,${height})`)
     .call(d3.axisBottom(xScale))
     .selectAll("text")
     .attr("transform", "rotate(-45)")
     .style("text-anchor", "end");

    g.append("g")
     .call(d3.axisLeft(yScale).ticks(8))
     .append("text")
     .attr("transform", "rotate(-90)")
     .attr("y", -50)
     .attr("x", -height / 2)
     .attr("dy", "1em")
     .attr("text-anchor", "middle")
     .attr("fill", "#333")
     .text("Nombre de rendez-vous");

    // Stacked bars
    const layers = g.selectAll(".layer")
                    .data(stackedData)
                    .enter()
                    .append("g")
                    .attr("class", "layer")
                    .style("fill", d => color(d.key));

    layers.selectAll("rect")
          .data(d => d)
          .enter()
          .append("rect")
          .attr("x", d => xScale(d.data.mois_prise))
          .attr("y", d => yScale(d[1]))
          .attr("height", d => yScale(d[0]) - yScale(d[1]))
          .attr("width", xScale.bandwidth())
          .attr("rx", 2);

    // Tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    g.selectAll("rect")
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(150).style("opacity", 0.95);
            tooltip.html(`Mois: ${d.data.mois_prise}<br/>Même mois: ${d.data.rendezvous_meme_mois}<br/>Mois suivants: ${d.data.rendezvous_mois_suivants}`)
                .style("left", (event.pageX + 8) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition().duration(200).style("opacity", 0);
        });

    // Légende
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 150}, 10)`);

    const legendData = [
        { label: "Rendez-vous même mois", color: "#4CAF50" },
        { label: "Rendez-vous mois suivants", color: "#FFC107" }
    ];

    legend.selectAll("rect")
        .data(legendData)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 22)
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", d => d.color)
        .attr("rx", 2);

    legend.selectAll("text")
        .data(legendData)
        .enter()
        .append("text")
        .attr("x", 20)
        .attr("y", (d, i) => i * 22 + 11)
        .text(d => d.label)
        .style("font-size", "12px")
        .style("fill", "#333");
}

// Chargement des données
export function loadStackedBarData(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');

    // Ajouter une vérification console pour les dates envoyées à l'API
    console.log("Requête envoyée avec startDate: ", startDate, " endDate: ", endDate);

    fetch(`/api/rendezvous?start=${startDate}&end=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Vérifier les données reçues de l'API
        console.log("Données API reçues : ", data);

        drawStackedBarChart(data.rendezvous_by_month);  // Dessiner le graphique empilé pour les rendez-vous par mois
    })
    .catch(error => console.error('Erreur lors de la récupération des données:', error));
}
