import { checkAuth } from "../utilities/utils.js";

export function loadVisitsAppointmentsChart(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
    
    fetch(`/api/patient-visits?startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        drawVisitsAppointmentsChart(data);
    })
    .catch(error => console.error('Erreur lors de la récupération des données:', error));
}

function drawVisitsAppointmentsChart(data) {
    const margin = { top: 30, right: 100, bottom: 70, left: 70 };
    const width = 1200 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Nettoyer le graphique existant
    d3.select("#visits-appointments-chart").selectAll("*").remove();

    const svg = d3.select("#visits-appointments-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Préparer les données (agrégation par mois)
    const monthlyData = {};
    data.forEach(d => {
        const month = d.month;
        if (!monthlyData[month]) {
            monthlyData[month] = {
                month: month,
                total_visits: 0,
                total_appointments: 0,
                cum_visits: 0,
                cum_appointments: 0
            };
        }
        monthlyData[month].total_visits += parseInt(d.new_patient_count) + parseInt(d.retained_patient_count) + parseInt(d.never_returned_patient_count) || 0;
    });

    // Récupérer les données de rendez-vous
    const token = localStorage.getItem('token');
    fetch(`/api/rendezvous?startDate=${data[0]?.month?.split('-').slice(0, 2).join('-')}-01&endDate=${data[data.length - 1]?.month}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(rendezvousData => {
        rendezvousData.forEach(d => {
            const month = d.month;
            if (monthlyData[month]) {
                monthlyData[month].total_appointments = d.total_appointments || 0;
            }
        });
        
        const processedData = Object.values(monthlyData).sort((a, b) => 
            new Date(a.month + '-01') - new Date(b.month + '-01')
        );

        // Calculer les cumuls
        let cumVisits = 0, cumAppointments = 0;
        processedData.forEach(d => {
            cumVisits += d.total_visits;
            cumAppointments += d.total_appointments;
            d.cum_visits = cumVisits;
            d.cum_appointments = cumAppointments;
        });

        // Échelels
        const xScale = d3.scaleBand()
            .domain(processedData.map(d => d.month))
            .range([0, width])
            .padding(0.3);

        const yScaleLeft = d3.scaleLinear()
            .domain([0, d3.max(processedData, d => Math.max(d.total_visits, d.total_appointments))])
            .nice()
            .range([height, 0]);

        const yScaleRight = d3.scaleLinear()
            .domain([0, d3.max(processedData, d => Math.max(d.cum_visits, d.cum_appointments))])
            .nice()
            .range([height, 0]);

        // Grille
        svg.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(yScaleLeft).ticks(8).tickSize(-width).tickFormat(""))
            .selectAll("line")
            .attr("stroke", "#e6e6e6")
            .attr("stroke-width", 0.5);

        // Axes
        const xAxis = svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        xAxis.selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        // Axe Y gauche
        svg.append("g")
            .call(d3.axisLeft(yScaleLeft).ticks(8))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -50)
            .attr("x", -height / 2)
            .attr("dy", "1em")
            .attr("text-anchor", "middle")
            .attr("fill", "#333")
            .attr("font-size", "12px")
            .text("Nombre mensuel");

        // Axe Y droite
        svg.append("g")
            .attr("transform", `translate(${width}, 0)`)
            .call(d3.axisRight(yScaleRight).ticks(8))
            .append("text")
            .attr("transform", "rotate(90)")
            .attr("y", 50)
            .attr("x", height / 2)
            .attr("dy", "1em")
            .attr("text-anchor", "middle")
            .attr("fill", "#333")
            .attr("font-size", "12px")
            .text("Cumul");

        // Tooltip
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        const barWidth = xScale.bandwidth() / 2;

        // Barres - Visites
        svg.selectAll(".bar-visits")
            .data(processedData)
            .enter()
            .append("rect")
            .attr("class", "bar-visits")
            .attr("x", d => xScale(d.month))
            .attr("y", d => yScaleLeft(d.total_visits))
            .attr("width", barWidth)
            .attr("height", d => height - yScaleLeft(d.total_visits))
            .attr("fill", "#2196F3")
            .attr("rx", 3)
            .on("mouseover", function(event, d) {
                tooltip.transition().duration(150).style("opacity", 0.95);
                tooltip.html(`Mois: ${d.month}<br/>Visites: ${d.total_visits}`)
                    .style("left", (event.pageX + 8) + "px")
                    .style("top", (event.pageY - 30) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition().duration(200).style("opacity", 0);
            });

        // Barres - Rendez-vous
        svg.selectAll(".bar-appointments")
            .data(processedData)
            .enter()
            .append("rect")
            .attr("class", "bar-appointments")
            .attr("x", d => xScale(d.month) + barWidth)
            .attr("y", d => yScaleLeft(d.total_appointments))
            .attr("width", barWidth)
            .attr("height", d => height - yScaleLeft(d.total_appointments))
            .attr("fill", "#4CAF50")
            .attr("rx", 3)
            .on("mouseover", function(event, d) {
                tooltip.transition().duration(150).style("opacity", 0.95);
                tooltip.html(`Mois: ${d.month}<br/>Rendez-vous: ${d.total_appointments}`)
                    .style("left", (event.pageX + 8) + "px")
                    .style("top", (event.pageY - 30) + "px");
            })
            .on("mouseout", function() {
                tooltip.transition().duration(200).style("opacity", 0);
            });

        // Lignes cumulatives
        const lineVisitsCumulative = d3.line()
            .x(d => xScale(d.month) + xScale.bandwidth() / 2)
            .y(d => yScaleRight(d.cum_visits));

        const lineAppointmentsCumulative = d3.line()
            .x(d => xScale(d.month) + xScale.bandwidth() / 2)
            .y(d => yScaleRight(d.cum_appointments));

        svg.append("path")
            .datum(processedData)
            .attr("fill", "none")
            .attr("stroke", "#2196F3")
            .attr("stroke-width", 2.5)
            .attr("stroke-dasharray", "5,5")
            .attr("d", lineVisitsCumulative);

        svg.append("path")
            .datum(processedData)
            .attr("fill", "none")
            .attr("stroke", "#4CAF50")
            .attr("stroke-width", 2.5)
            .attr("stroke-dasharray", "5,5")
            .attr("d", lineAppointmentsCumulative);

        // Points sur les lignes
        const pointRadius = 4;

        svg.selectAll(".point-visits")
            .data(processedData)
            .enter()
            .append("circle")
            .attr("class", "point-visits")
            .attr("cx", d => xScale(d.month) + xScale.bandwidth() / 2)
            .attr("cy", d => yScaleRight(d.cum_visits))
            .attr("r", pointRadius)
            .attr("fill", "#2196F3")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);

        svg.selectAll(".point-appointments")
            .data(processedData)
            .enter()
            .append("circle")
            .attr("class", "point-appointments")
            .attr("cx", d => xScale(d.month) + xScale.bandwidth() / 2)
            .attr("cy", d => yScaleRight(d.cum_appointments))
            .attr("r", pointRadius)
            .attr("fill", "#4CAF50")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);

        // Légende
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width + 50}, 0)`);

        const legendData = [
            { label: "Visites (barres)", color: "#2196F3", type: "bar" },
            { label: "Rendez-vous (barres)", color: "#4CAF50", type: "bar" },
            { label: "Cumul visites (ligne)", color: "#2196F3", type: "line" },
            { label: "Cumul rendez-vous (ligne)", color: "#4CAF50", type: "line" }
        ];

        legendData.forEach((item, index) => {
            const legendRow = legend.append("g")
                .attr("transform", `translate(0, ${index * 25})`);

            if (item.type === "bar") {
                legendRow.append("rect")
                    .attr("width", 15)
                    .attr("height", 15)
                    .attr("fill", item.color)
                    .attr("rx", 2);
            } else {
                legendRow.append("line")
                    .attr("x1", 0)
                    .attr("x2", 15)
                    .attr("stroke", item.color)
                    .attr("stroke-width", 2.5)
                    .attr("stroke-dasharray", "5,5");
                
                legendRow.append("circle")
                    .attr("cx", 7.5)
                    .attr("cy", 0)
                    .attr("r", 3)
                    .attr("fill", item.color)
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 1.5);
            }

            legendRow.append("text")
                .attr("x", 25)
                .attr("y", 12)
                .attr("font-size", "11px")
                .attr("fill", "#333")
                .text(item.label);
        });
    })
    .catch(error => console.error('Erreur lors de la récupération des rendez-vous:', error));
}
