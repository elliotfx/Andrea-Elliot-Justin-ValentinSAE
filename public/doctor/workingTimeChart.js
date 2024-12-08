export function updateDoctorWorkTimeAnalysisChart(stats) {
    // Supprimer les anciens éléments du graphique
    d3.select("#work-time-chart").selectAll("*").remove();

    // Définir les marges et dimensions du graphique
    const margin = { top: 30, right: 100, bottom: 50, left: 70 };
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Sélectionner ou créer le conteneur SVG
    const svg = d3.select("#work-time-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Ajouter un conteneur pour le tooltip
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background-color', 'rgba(0, 0, 0, 0.7)')
        .style('color', '#fff')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none');

    // Préparer les données pour le graphique
    const months = Object.keys(stats);
    const data = months.map(month => {
        return {
            month: month,
            total_hours: stats[month].stats.total_hours,
            revenuePerHour: stats[month].stats.revenuePerHour,
            totalPatients: stats[month].stats.uniquePatients,
            totalPaidForConsultations: stats[month].stats.totalPaidForConsultations,
            totalVisits: stats[month].stats.totalVisits
        };
    });

    // Créer les échelles
    const x0 = d3.scaleBand()
        .domain(data.map(d => d.month))
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, 200])  // Limite fixée à 120 heures
        .range([height, 0]);

    // Ajouter le second axe Y pour le revenu par heure
    const y2 = d3.scaleLinear()
        .domain([0, 50000])
        .nice()
        .range([height, 0]);

    // Palette de couleurs pour les barres
    const colorBar = '#4CAF50';  // Couleur pour le nombre total d'heures

    // Couleur pour la courbe (revenu par heure)
    const lineColor = '#ff7f0e';  // Couleur pour la courbe

    // Ajouter l'axe X
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x0));

    // Ajouter l'axe Y pour le nombre total d'heures
    svg.append('g')
        .call(d3.axisLeft(y));

    // Ajouter l'axe Y2 pour le revenu par heure
    svg.append('g')
        .attr('transform', `translate(${width},0)`)
        .call(d3.axisRight(y2));

    // Ajouter les barres pour le nombre total d'heures
    svg.selectAll('rect')
        .data(data)
        .enter()
        .append('rect')
        .attr('x', d => x0(d.month))
        .attr('y', d => y(d.total_hours))
        .attr('width', x0.bandwidth())
        .attr('height', d => height - y(d.total_hours))
        .attr('fill', colorBar)
        .on('mouseover', function (event, d) {
            tooltip.transition().duration(200).style('opacity', .9);
            tooltip.html(`
                <strong>Mois :</strong> ${d.month}<br>
                <strong>Nombre de Patients :</strong> ${d.totalPatients}<br>
                <strong>Nombre de Rendez-vous :</strong> ${d.totalVisits}<br>
                <strong>CA Total :</strong> ${d.totalPaidForConsultations} €<br>
                <strong>Total d'Heures :</strong> ${d.total_hours}
            `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function () {
            tooltip.transition().duration(500).style('opacity', 0);
        });

    // Ajouter la courbe pour le revenu par heure
    const lineGenerator = d3.line()
        .x(d => x0(d.month) + x0.bandwidth() / 2)
        .y(d => y2(d.revenuePerHour));

    svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', 2)
        .attr('d', lineGenerator);

    // Ajouter des labels d'axes
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom)
        .attr('text-anchor', 'middle')
        .text('Mois');

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 15)
        .attr('text-anchor', 'middle')
        .text('Nombre Total d\'Heures');

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', width + margin.right - 30)
        .attr('text-anchor', 'middle')
        .text('Revenu par Heure (DA)');

    // Ajouter une légende
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width + 100}, ${margin.top})`);

    // Légende pour Nombre Total d'Heures (barre)
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 18)
        .attr('height', 18)
        .style('fill', colorBar);
    legend.append('text')
        .attr('x', 25)
        .attr('y', 12)
        .attr('dy', '0.35em')
        .text('Total d\'Heures');

    // Légende pour Revenu par Heure (courbe)
    legend.append('line')
        .attr('x1', 0)
        .attr('y1', 25)
        .attr('x2', 18)
        .attr('y2', 25)
        .attr('stroke', lineColor)
        .attr('stroke-width', 2);
    legend.append('text')
        .attr('x', 25)
        .attr('y', 30)
        .attr('dy', '0.35em')
        .text('Revenu par Heure');
}
