export function updateAppointmentsAnalysisChart(stats) {
    // Supprimer les anciens éléments du graphique
    d3.select("#appointments-chart").selectAll("*").remove();

    // Définir les marges et dimensions du graphique
    const margin = { top: 30, right: 100, bottom: 50, left: 70 };
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Sélectionner ou créer le conteneur SVG
    const svg = d3.select("#appointments-chart")
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
        const monthStats = stats[month].stats;
        return {
            month: month,
            totalVisits: monthStats.totalVisits || 0,
            VisitsByNewPatientsClinic: monthStats.VisitsByNewPatientsClinic || 0,
            uniquePatients: monthStats.uniquePatients || 0,
            newPatients: monthStats.newPatients || 0,
            loyalPatients: monthStats.loyalPatients || 0,
            patientsPremiereVisite: monthStats.patientsPremiereVisite || 0
        };
    });

    // Créer les échelles
    const x0 = d3.scaleBand()
        .domain(data.map(d => d.month))
        .range([0, width])
        .padding(0.2);

    const x1 = d3.scaleBand()
        .domain(['totalVisits', 'newPatients', 'loyalPatients'])
        .range([0, x0.bandwidth()])
        .padding(0.05);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => Math.max(d.totalVisits, d.newPatients, d.loyalPatients))])
        .nice()
        .range([height, 0]);

    // Palette de couleurs pour les barres
    const color = d3.scaleOrdinal()
        .domain(['totalVisits', 'newPatients', 'loyalPatients'])
        .range(['#4CAF50', '#00A5CF', '#FFA500']);

    // Couleurs pour les courbes
    const lineColors = {
        totalVisits: '#1f77b4',      // Bleu
        newPatients: '#ff7f0e',  // Orange
        loyalPatients: '#2ca02c'  // Vert
    };

    // Ajouter l'axe X
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x0));

    // Ajouter l'axe Y pour le nombre de visites
    svg.append('g')
        .call(d3.axisLeft(y));

    // Ajouter les barres pour chaque catégorie
    const categories = ['totalVisits', 'newPatients', 'loyalPatients'];

    const groups = svg.selectAll('g.group')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'group')
        .attr('transform', d => `translate(${x0(d.month)},0)`);

    groups.selectAll('rect')
        .data(d => categories.map(key => ({
            key: key,
            value: d[key],
            month: d.month
        })))
        .enter()
        .append('rect')
        .attr('x', d => x1(d.key))
        .attr('y', d => y(d.value))
        .attr('width', x1.bandwidth())
        .attr('height', d => height - y(d.value))
        .attr('fill', d => color(d.key))
        .on('mouseover', function (event, d) {
            tooltip.transition().duration(200).style('opacity', .9);
            tooltip.html(`
                <strong>Mois :</strong> ${d.month}<br>
                <strong>${getLabelForKey(d.key)} :</strong> ${d.value}
            `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function () {
            tooltip.transition().duration(500).style('opacity', 0);
        });

    // Ajouter des labels d'axes
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .text('Mois');

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 15)
        .attr('text-anchor', 'middle')
        .text('Nombre de Visites');

    // Ajouter une légende simplifiée
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 150}, ${margin.top})`);

    const legendData = [
        { key: 'totalVisits', label: 'Visites Totales' },
        { key: 'newPatients', label: 'Nouveaux Patients' },
        { key: 'loyalPatients', label: 'Patients Fidèles' }
    ];

    legendData.forEach((item, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);

        legendRow.append('rect')
            .attr('width', 18)
            .attr('height', 18)
            .style('fill', color(item.key));

        legendRow.append('text')
            .attr('x', 25)
            .attr('y', 9)
            .attr('dy', '0.35em')
            .text(item.label);
    });
}

// Fonction pour obtenir le label d'une catégorie
function getLabelForKey(key) {
    switch (key) {
        case 'totalVisits':
            return 'Visites Totales';
        case 'newPatients':
            return 'Nouveaux Patients';
        case 'loyalPatients':
            return 'Patients Fidèles';
        default:
            return key;
    }
}
