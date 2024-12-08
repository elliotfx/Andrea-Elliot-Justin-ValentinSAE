import { checkAuth } from "../utilities/utils.js";


function drawStackedBarChart(data) {
    const svg = d3.select("#stacked-bar-chart");
    const margin = { top: 20, right: 20, bottom: 70, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Vérification des données
    console.log("Data reçue pour le graphique : ", data);

    svg.attr("width", width + margin.left + margin.right)
       .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand().range([0, width]).padding(0.4);
    const yScale = d3.scaleLinear().range([height, 0]);

    // Vérification des données après le mapping
    const months = data.map(d => d.mois_prise);
    console.log("Mois : ", months);

    // Définir les couleurs pour les barres empilées
    const color = d3.scaleOrdinal()
                    .domain(["rendezvous_meme_mois", "rendezvous_mois_suivants"])
                    .range(["#4CAF50", "#FF9800"]);

    // Empiler les données pour rendezvous_meme_mois et rendezvous_mois_suivants
    const stackedData = d3.stack()
        .keys(["rendezvous_meme_mois", "rendezvous_mois_suivants"])
        (data);

    console.log("Stacked data : ", stackedData);

    // Définir les domaines des échelles
    xScale.domain(data.map(d => d.mois_prise));  // Utilisation de la clé correcte 'mois_prise'
    yScale.domain([0, d3.max(stackedData[stackedData.length - 1], d => d[1])]);

    // Ajout des axes
    g.append("g")
     .attr("transform", `translate(0,${height})`)
     .call(d3.axisBottom(xScale))
     .selectAll("text")
     .attr("transform", "rotate(-45)")
     .style("text-anchor", "end");

    g.append("g")
     .call(d3.axisLeft(yScale).ticks(10))
     .append("text")
     .attr("transform", "rotate(-90)")
     .attr("y", -50)
     .attr("x", -height / 2)
     .attr("dy", "1em")
     .attr("text-anchor", "middle")
     .attr("fill", "black")
     .text("Nombre de rendez-vous");

    // Création des barres empilées
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
          .attr("x", d => xScale(d.data.mois_prise))  // Utilisation de 'mois_prise' pour l'axe des X
          .attr("y", d => yScale(d[1]))
          .attr("height", d => yScale(d[0]) - yScale(d[1]))
          .attr("width", xScale.bandwidth());

    // Ajout du tooltip au survol
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    g.selectAll("rect")
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`Mois: ${d.data.mois_prise}<br/>Rendez-vous même mois: ${d.data.rendezvous_meme_mois}<br/>Rendez-vous mois suivant: ${d.data.rendezvous_mois_suivants}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition().duration(500).style("opacity", 0);
        });
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
