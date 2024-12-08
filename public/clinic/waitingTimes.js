import { checkAuth } from "../utilities/utils.js";

export function loadWaitingTimes(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
    fetch(`/api/waiting-times?start-date=${startDate}&end-date=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, // Ajouter le token JWT dans l'en-tête Authorization
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Mettre à jour les visualisations
        drawMonthlyWaitingTimeChart(data.avg_waiting_time_by_month); // Nouveau graphique pour temps d'attente moyen par mois
        drawDoctorWaitingTimeChart(data.avg_waiting_time_by_doctor); // Graphique pour les temps d'attente par médecin
    })
    .catch(error => console.error('Erreur lors de la récupération des données:', error));
}


    // Visualisation pour le temps d'attente moyen global (Graphique linéaire)
    function drawMonthlyWaitingTimeChart(monthlyData) {
        const svg = d3.select("#waiting-time-monthly-chart");
        const margin = { top: 20, right: 20, bottom: 70, left: 60 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;
    
        svg.attr("width", width + margin.left + margin.right)
           .attr("height", height + margin.top + margin.bottom);
    
        const g = svg.append("g")
                     .attr("transform", `translate(${margin.left},${margin.top})`);
    
        const xScale = d3.scaleBand().range([0, width]).padding(0.4);
        const yScale = d3.scaleLinear().range([height, 0]);
    
        // Définir le domaine des échelles avec une limite maximale de 120 pour l'axe Y
        xScale.domain(monthlyData.map(d => d.month));
        yScale.domain([0, 120]); // La limite maximale est fixée à 120
    
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
         .text("Temps d'attente (minutes)");
    
        // Ajout du tooltip (info-bulle)
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
    
        // Ajout des barres avec le tooltip au survol
        g.selectAll(".bar")
         .data(monthlyData)
         .enter()
         .append("rect")
         .attr("class", "bar")
         .attr("x", d => xScale(d.month))
         .attr("y", d => yScale(d.avg_waiting_time))
         .attr("width", xScale.bandwidth())
         .attr("height", d => height - yScale(d.avg_waiting_time))
         .attr("fill", "steelblue")  // Utiliser votre couleur de barre globale
         .on("mouseover", function(event, d) {
             tooltip.transition().duration(200).style("opacity", .9);
             tooltip.html(`Mois: ${d.month}<br/>Temps moyen: ${d.avg_waiting_time} min`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
         })
         .on("mouseout", function() {
             tooltip.transition().duration(500).style("opacity", 0);
         });
    
        // Ajout des seuils
        const thresholds = [
            { value: 30, color: "green" },
            { value: 45, color: "orange" },
            { value: 60, color: "red" },
            { value: 120, color: "black" }
        ];
    
        // Dessiner les lignes des seuils
        thresholds.forEach(threshold => {
            g.append("line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", yScale(threshold.value))
                .attr("y2", yScale(threshold.value))
                .attr("stroke", threshold.color)
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "4");
        });
    }
    
    

    function drawDoctorWaitingTimeChart(doctorsData) {
        const margin = { top: 20, right: 20, bottom: 70, left: 60 }; // Marges
        const width = 800 - margin.left - margin.right; // Largeur du graphique
        const height = 400 - margin.top - margin.bottom; // Hauteur du graphique
    
        const svg = d3.select("#waiting-time-doctors-chart")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    
        svg.selectAll("*").remove(); // Supprimer l'ancien graphique
    
        const xScale = d3.scaleBand().range([0, width]).padding(0.4);
        const yScale = d3.scaleLinear().range([height, 0]);
    
        // Définir les domaines de l'échelle x et y
        xScale.domain(doctorsData.map(d => d.doctor_name));
        yScale.domain([0, 120]); // Limite maximale à 120 minutes
    
        // Ajout des axes
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");
    
        // Ajout de l'axe Y avec des valeurs de temps d'attente
        svg.append("g")
            .call(d3.axisLeft(yScale).ticks(10)) // Ajouter les ticks pour l'axe Y avec 10 divisions
            .append("text") // Ajout d'une étiquette pour l'axe Y
            .attr("transform", "rotate(-90)")
            .attr("y", -50)
            .attr("x", -height / 2)
            .attr("dy", "1em")
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .text("Temps d'attente (minutes)");
    
        // Ajouter les lignes horizontales (vert à 30, jaune à 45, rouge à 60, noir à 120)
        const thresholds = [
            { value: 30, color: "green" },
            { value: 45, color: "orange" },
            { value: 60, color: "red" },
            { value: 120, color: "black" }
        ];
    
        thresholds.forEach(threshold => {
            svg.append("line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", yScale(threshold.value))
                .attr("y2", yScale(threshold.value))
                .attr("stroke", threshold.color)
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "4");
        });
    
        // Ajout des barres
        svg.selectAll(".bar")
            .data(doctorsData)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => xScale(d.doctor_name))
            .attr("y", d => yScale(d.avg_waiting_time_per_doctor))
            .attr("width", xScale.bandwidth())
            .attr("height", d => height - yScale(d.avg_waiting_time_per_doctor))
            .attr("fill", "steelblue")
            .on("mouseover", function (event, d) {
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(`${d.avg_waiting_time_per_doctor} min`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                tooltip.transition().duration(500).style("opacity", 0);
            });
    
        // Ajout du texte pour chaque barre
        svg.selectAll(".text")
            .data(doctorsData)
            .enter()
            .append("text")
            .attr("class", "label")
            .attr("x", d => xScale(d.doctor_name) + xScale.bandwidth() / 2)
            .attr("y", d => yScale(d.avg_waiting_time_per_doctor) - 5)
            .attr("dy", ".75em")
            .attr("text-anchor", "middle");
    
        // Ajout de l'info-bulle (tooltip)
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
    }
    