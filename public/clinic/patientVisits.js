import { checkAuth } from "../utilities/utils.js";
    // Fonction pour charger les données du graphique
    export function loadChartData(startDate, endDate) {
        checkAuth();
        const token = localStorage.getItem('token');
        fetch(`/api/patient-visits?startDate=${startDate}&endDate=${endDate}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, // Ajouter le token JWT dans l'en-tête Authorization
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            const margin = { top: 30, right: 70, bottom: 50, left: 70 };
            const width = 1000 - margin.left - margin.right;
            const height = 500 - margin.top - margin.bottom;

            // Supprimer l'ancien graphique avant de dessiner le nouveau
            d3.select("#patient-visits-chart").selectAll("*").remove();

            const svg = d3.select("#patient-visits-chart")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const x = d3.scaleBand()
                .domain(data.map(d => d.month))
                .range([0, width])
                .padding(0.2);

            const yLeft = d3.scaleLinear()
                .domain([0, d3.max(data, d => Math.max(d.new_patient_count, d.retained_patient_count, d.never_returned_patient_count))])
                .nice()
                .range([height, 0]);

            const yRight = d3.scaleLinear()
                .domain([0, d3.max(data, d => Math.max(d.cumulative_new_patient_count, d.cumulative_retained_patient_count, d.cumulative_never_returned_patient_count))])
                .nice()
                .range([height, 0]);

            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip");

            // Bars for new patients
            svg.selectAll(".bar-new-patients")
                .data(data)
                .enter().append("rect")
                .attr("class", "bar-new-patients")
                .attr("x", d => x(d.month))
                .attr("y", d => yLeft(d.new_patient_count))
                .attr("width", x.bandwidth() / 3)
                .attr("height", d => height - yLeft(d.new_patient_count))
                .attr("fill", "#1F77B4")  // Bleu moderne
                .on("mouseover", function(event, d) {
                    tooltip.transition().duration(200).style("opacity", .9);
                    tooltip.html(`Nouveaux patients : ${d.new_patient_count}`)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    tooltip.transition().duration(500).style("opacity", 0);
                });

            // Bars for retained patients
            svg.selectAll(".bar-retained-patients")
                .data(data)
                .enter().append("rect")
                .attr("class", "bar-retained-patients")
                .attr("x", d => x(d.month) + x.bandwidth() / 3)
                .attr("y", d => yLeft(d.retained_patient_count))
                .attr("width", x.bandwidth() / 3)
                .attr("height", d => height - yLeft(d.retained_patient_count))
                .attr("fill", "#2CA02C")  // Vert vif
                .on("mouseover", function(event, d) {
                    tooltip.transition().duration(200).style("opacity", .9);
                    tooltip.html(`Patients retenus : ${d.retained_patient_count}`)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    tooltip.transition().duration(500).style("opacity", 0);
                });

            // Bars for never returned patients
            svg.selectAll(".bar-never-returned")
                .data(data)
                .enter().append("rect")
                .attr("class", "bar-never-returned")
                .attr("x", d => x(d.month) + 2 * (x.bandwidth() / 3))
                .attr("y", d => yLeft(d.never_returned_patient_count))
                .attr("width", x.bandwidth() / 3)
                .attr("height", d => height - yLeft(d.never_returned_patient_count))
                .attr("fill", "#D62728")  // Rouge profond
                .on("mouseover", function(event, d) {
                    tooltip.transition().duration(200).style("opacity", .9);
                    tooltip.html(`Patients n'étant jamais revenus : ${d.never_returned_patient_count}`)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    tooltip.transition().duration(500).style("opacity", 0);
                });

            // Line for cumulative new patients
            const lineNewPatients = d3.line()
                .x(d => x(d.month) + x.bandwidth() / 2)
                .y(d => yRight(d.cumulative_new_patient_count));

            svg.append("path")
                .datum(data)
                .attr("class", "line-new-patients")
                .attr("d", lineNewPatients)
                .attr("stroke", "#9467BD")  // Violet moyen
                .attr("stroke-width", 3)
                .attr("fill", "none");

            // Line for cumulative retained patients
            const lineRetainedPatients = d3.line()
                .x(d => x(d.month) + x.bandwidth() / 2)
                .y(d => yRight(d.cumulative_retained_patient_count));

            svg.append("path")
                .datum(data)
                .attr("class", "line-retained-patients")
                .attr("d", lineRetainedPatients)
                .attr("stroke", "#FF7F0E")  // Orange éclatant
                .attr("stroke-width", 3)
                .attr("fill", "none");

            // Line for cumulative never returned patients
            const lineNeverReturned = d3.line()
                .x(d => x(d.month) + x.bandwidth() / 2)
                .y(d => yRight(d.cumulative_never_returned_patient_count));

            svg.append("path")
                .datum(data)
                .attr("class", "line-never-returned")
                .attr("d", lineNeverReturned)
                .attr("stroke", "#8C564B")  // Marron doux
                .attr("stroke-width", 3)
                .attr("fill", "none");

            // Axes
            svg.append("g")
                .attr("class", "x-axis")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x))
                .selectAll("text")
                .attr("transform", "rotate(-45)")
                .style("text-anchor", "end");

            svg.append("g")
                .attr("class", "y-axis")
                .call(d3.axisLeft(yLeft));

            svg.append("g")
                .attr("class", "y-axis")
                .attr("transform", `translate(${width}, 0)`)
                .call(d3.axisRight(yRight));

            // Add axis labels
            svg.append("text")
                .attr("class", "axis-label")
                .attr("transform", "rotate(-90)")
                .attr("y", 0 - margin.left)
                .attr("x", 0 - (height / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .text("Nombre de Patients");

            svg.append("text")
                .attr("class", "axis-label")
                .attr("transform", "rotate(-90)")
                .attr("y", width + margin.right - 20)
                .attr("x", 0 - (height / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .text("Cumul des Patients");

            // Add legends
            const legend = svg.append("g")
                .attr("class", "legend")
                .attr("transform", `translate(${width - 150},${-margin.top})`);

            const legendData = [
                { label: "Nouveaux Patients", color: "#1F77B4" },  // Bleu moderne
                { label: "Patients Retenus", color: "#2CA02C" },  // Vert vif
                { label: "Patients N'étant Jamais Revenu", color: "#D62728" },  // Rouge profond
                { label: "Cumul Nouveaux Patients", color: "#9467BD" },  // Violet moyen
                { label: "Cumul Patients Retenus", color: "#FF7F0E" },  // Orange éclatant
                { label: "Cumul Patients N'étant Jamais Revenu", color: "#8C564B" }  // Marron doux
            ];

            legend.selectAll("rect")
                .data(legendData)
                .enter().append("rect")
                .attr("x", 0)
                .attr("y", (d, i) => i * 20)
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", d => d.color);

            legend.selectAll("text")
                .data(legendData)
                .enter().append("text")
                .attr("x", 20)
                .attr("y", (d, i) => i * 20 + 12)
                .text(d => d.label)
                .style("font-size", "12px")
                .attr("alignment-baseline", "middle");
        })
        .catch(error => console.error('Erreur lors de la récupération des données:', error));
    }
