import { checkAuth } from "../utilities/utils.js";

    // Fonction pour charger les données de la heatmap et mettre à jour le graphique
   export function loadPatientsHeatmap(startDate, endDate) {
        checkAuth();
        const token = localStorage.getItem('token');
        // Suppression du SVG précédent
        d3.selectAll("svg > *").remove();

        let url = `/api/heatmap-data?start=${startDate}&end=${endDate}`;

        fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, // Ajouter le token JWT dans l'en-tête Authorization
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            const margin = { top: 50, right: 50, bottom: 100, left: 100 };
            const width = 1200 - margin.left - margin.right;
            const height = 600 - margin.top - margin.bottom;

            const hourRanges = [
                '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00',
                '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00',
                '16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00',
                '20:00-21:00', '21:00-22:00', '22:00-23:00', '23:00-00:00', '00:00-01:00', '01:00-02:00', '02:00-03:00', '03:00-04:00',
                '04:00-05:00', '05:00-06:00', '06:00-07:00', '07:00-08:00'
            ];

            const months = Array.from(new Set(data.map(d => d.month)))
                .sort((a, b) => new Date(a + '-01') - new Date(b + '-01'));

            const completeData = [];
            months.forEach(month => {
                hourRanges.forEach(hour_range => {
                    const found = data.find(d => d.month === month && d.hour_range === hour_range);
                    completeData.push({
                        month: month,
                        hour_range: hour_range,
                        unique_patients: found ? found.unique_patients : 0,
                        total_subsequent_visits: found ? found.total_subsequent_visits : 0
                    });
                });
            });

            const createHeatmap = (selector, valueKey, colorScale) => {
                const svg = d3.select(selector)
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", `translate(${margin.left},${margin.top})`);

                // Pivot the axes: months on x-axis and hours on y-axis
                const x = d3.scaleBand()
                    .range([0, width])
                    .domain(months)
                    .padding(0.05);

                const y = d3.scaleBand()
                    .range([0, height])
                    .domain(hourRanges)
                    .padding(0.05);

                // Create heatmap rectangles
                svg.append("g")
                    .selectAll("rect")
                    .data(completeData)
                    .enter()
                    .append("rect")
                    .attr("x", d => x(d.month))
                    .attr("y", d => y(d.hour_range))
                    .attr("width", x.bandwidth())
                    .attr("height", y.bandwidth())
                    .style("fill", d => colorScale(d[valueKey]))
                    .style("stroke", "#ccc")
                    .style("stroke-width", "1px");

                // Add x-axis (Months)
                svg.append("g")
                    .attr("transform", `translate(0,${height})`)
                    .call(d3.axisBottom(x))
                    .selectAll("text")
                    .attr("transform", "rotate(-45)")
                    .style("text-anchor", "end");

                // Add y-axis (Hour ranges)
                svg.append("g")
                    .call(d3.axisLeft(y));

                // Add text labels to each rectangle
                svg.append("g")
                    .selectAll("text")
                    .data(completeData)
                    .enter()
                    .append("text")
                    .attr("x", d => x(d.month) + x.bandwidth() / 2)
                    .attr("y", d => y(d.hour_range) + y.bandwidth() / 2)
                    .attr("text-anchor", "middle")
                    .attr("dy", ".35em")
                    .text(d => d[valueKey])
                    .style("fill", "#000");
            };

            // Heatmap for unique patients
            const uniquePatientsColor = d3.scaleSequential()
                .interpolator(d3.interpolateBlues)
                .domain([d3.min(completeData, d => d.unique_patients), d3.max(completeData, d => d.unique_patients)]);

            createHeatmap("#unique-patients-heatmap", "unique_patients", uniquePatientsColor);

            // Heatmap for total subsequent visits
            const subsequentVisitsColor = d3.scaleSequential()
                .interpolator(d3.interpolateBlues)
                .domain([d3.min(completeData, d => d.total_subsequent_visits), d3.max(completeData, d => d.total_subsequent_visits)]);

            createHeatmap("#subsequent-visits-heatmap", "total_subsequent_visits", subsequentVisitsColor);
        })
        .catch(error => console.error('Erreur lors de la récupération des données de la heatmap:', error));
    }