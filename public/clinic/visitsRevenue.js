import { checkAuth } from "../utilities/utils.js";

    // Fonction pour charger les données avec une période donnée
    export function loadVisitsRevenue(startDate, endDate) {
        checkAuth();
        const token = localStorage.getItem('token');
        fetch(`/api/visits-revenue?start-date=${startDate}&end-date=${endDate}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, // Ajouter le token JWT dans l'en-tête Authorization
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            // Effacer les anciens éléments SVG avant de redessiner le graphique
            d3.select("#visits-revenue-chart").selectAll("*").remove();

            const margin = { top: 30, right: 70, bottom: 50, left: 70 };
            const width = 1000 - margin.left - margin.right;
            const height = 500 - margin.top - margin.bottom;

            const svg = d3.select("#visits-revenue-chart")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const x = d3.scaleBand()
                .domain(data.map(d => d.month))
                .range([0, width])
                .padding(0.2);

            const yLeft = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.visit_count)])
                .nice()
                .range([height, 0]);

            const yRight = d3.scaleLinear()
                .domain([0, d3.max(data, d => d.revenue)])
                .nice()
                .range([height, 0]);

            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip");

            svg.selectAll(".bar")
                .data(data)
                .enter().append("rect")
                .attr("class", "bar")
                .attr("x", d => x(d.month))
                .attr("y", d => yLeft(d.visit_count))
                .attr("width", x.bandwidth())
                .attr("height", d => height - yLeft(d.visit_count))
                .on("mouseover", function(event, d) {
                    tooltip.transition().duration(200).style("opacity", .9);
                    tooltip.html(`Visits: ${d.visit_count}<br>Revenue: ${d.revenue} €`)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    tooltip.transition().duration(500).style("opacity", 0);
                })
                .on("click", function(event, d) {
                    updateConsultationsChart(d.month); // Update the "Consultations per Doctor" chart
                });

            const line = d3.line()
                .x(d => x(d.month) + x.bandwidth() / 2)
                .y(d => yRight(d.revenue));

            svg.append("path")
                .datum(data)
                .attr("class", "line")
                .attr("d", line);

            // Ajouter des points sur la ligne
            svg.selectAll(".dot")
                .data(data)
                .enter().append("circle")
                .attr("class", "dot")
                .attr("cx", d => x(d.month) + x.bandwidth() / 2)
                .attr("cy", d => yRight(d.revenue))
                .attr("r", 5)
                .on("mouseover", function(event, d) {
                    tooltip.transition().duration(200).style("opacity", .9);
                    tooltip.html(`Visits: ${d.visit_count}<br>Revenue: ${d.revenue} €`)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function() {
                    tooltip.transition().duration(500).style("opacity", 0);
                });

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

            svg.append("text")
                .attr("class", "axis-label")
                .attr("transform", "rotate(-90)")
                .attr("y", 0 - margin.left)
                .attr("x", 0 - (height / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .text("Number of Visits");

            svg.append("text")
                .attr("class", "axis-label")
                .attr("transform", "rotate(-90)")
                .attr("y", width + margin.right - 20)
                .attr("x", 0 - (height / 2))
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .text("Revenue (€)");

            // Adding the legend on the right side
            const legend = svg.append("g")
                .attr("class", "legend")
                .attr("transform", `translate(${width + 80},${height / 2 - 40})`);

            // Cadre de la légende
            legend.append("rect")
                .attr("x", -15)
                .attr("y", -15)
                .attr("width", 150)
                .attr("height", 80)
                .attr("rx", 6)
                .attr("fill", "#ffffff")
                .attr("stroke", "#ddd")
                .attr("stroke-width", 1);

            const legendData = [
                { label: "Number of Visits", color: "steelblue" },
                { label: "Revenue (€)", color: "orange" }
            ];

            legend.selectAll("rect.legend-box")
                .data(legendData)
                .enter().append("rect")
                .attr("class", "legend-box")
                .attr("x", 0)
                .attr("y", (d, i) => i * 30)
                .attr("width", 15)
                .attr("height", 15)
                .attr("rx", 2)
                .attr("fill", d => d.color);

            legend.selectAll("text")
                .data(legendData)
                .enter().append("text")
                .attr("x", 22)
                .attr("y", (d, i) => i * 30 + 12)
                .text(d => d.label)
                .style("font-size", "12px")
                .style("font-weight", "500")
                .attr("alignment-baseline", "middle");
        })
        .catch(error => console.error('Erreur lors de la récupération des données:', error));
    }