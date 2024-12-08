import { checkAuth,formatWaitingTime } from "../utilities/utils.js";

export function loadWaitingTimeHeatmap(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');

    d3.json(`/api/waiting-times-heatmap?start=${startDate}&end=${endDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(data => {
        // Convertir les valeurs de avg_waiting_time en nombre
        data.forEach(d => {
            d.avg_waiting_time = +d.avg_waiting_time;  // Conversion explicite en nombre
        });

        // Plages horaires de la journée
        const hourRanges = [
            '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00',
            '13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00',
            '17:00-18:00', '18:00-19:00', '19:00-20:00', '20:00-21:00',
            '21:00-22:00', '22:00-23:00', '23:00-00:00', '00:00-01:00',
            '01:00-02:00', '02:00-03:00', '03:00-04:00', '04:00-05:00',
            '05:00-06:00', '06:00-07:00', '07:00-08:00'
        ];

        // Trier les mois dans l'ordre chronologique
        const months = [...new Set(data.map(d => d.month))].sort((a, b) => new Date(a + '-01') - new Date(b + '-01'));

        // Trier les données par mois et plage horaire
        data.sort((a, b) => {
            const dateA = new Date(a.month + '-01');
            const dateB = new Date(b.month + '-01');
            const hourA = hourRanges.indexOf(a.hour_range);
            const hourB = hourRanges.indexOf(b.hour_range);
            return dateA - dateB || hourA - hourB;
        });

        // Sélectionner le conteneur du heatmap
        d3.select("#waiting-time-heatmap").selectAll("*").remove();

        const margin = { top: 30, right: 50, bottom: 50, left: 90 };
        const width = 1200 - margin.left - margin.right;
        const height = 600 - margin.top - margin.bottom;

        const svg = d3.select("#waiting-time-heatmap")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(months)
            .range([0, width])
            .padding(0.05);

        const y = d3.scaleBand()
            .domain(hourRanges)
            .range([0, height])
            .padding(0.05);

        const colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([0, d3.max(data, d => d.avg_waiting_time)]);

        // Créer les cellules du heatmap
        svg.selectAll("rect")
            .data(data, d => d.month + ':' + d.hour_range)
            .enter()
            .append("rect")
            .attr("x", d => x(d.month))
            .attr("y", d => y(d.hour_range))
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .style("fill", d => colorScale(d.avg_waiting_time));

        // Ajouter le texte des valeurs dans les cellules
        svg.selectAll("text")
            .data(data, d => d.month + ':' + d.hour_range)
            .enter()
            .append("text")
            .attr("x", d => x(d.month) + x.bandwidth() / 2)
            .attr("y", d => y(d.hour_range) + y.bandwidth() / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("fill", "black")
            .style("font-size", "12px")
            .text(d => formatWaitingTime(d.avg_waiting_time));  // Utilise la fonction formatée

        // Ajouter l'axe X (mois)
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickSize(0))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("transform", "rotate(-45)");

        // Ajouter l'axe Y (plages horaires)
        svg.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(y).tickSize(0))
            .selectAll("text")
            .style("fill", "black")
            .style("font-size", "12px");
    }).catch(error => {
        console.error('Erreur lors de la récupération des données:', error);
    });
}