export function updateTimeAnalysisChart(timeAnalysisData) {
    // Sélectionner ou créer le conteneur SVG et effacer les anciens éléments
    const svg = d3.select("#performance-chart");
    svg.selectAll('*').remove(); // Effacer les anciens éléments du graphique

    const margin = { top: 20, right: 70, bottom: 40, left: 50 };
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Créer un groupe 'g' pour le graphique
    const g = svg
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Transformer l'année et le numéro de semaine en date
    const parseWeekData = data => {
        const firstDayOfYear = new Date(data.year, 0, 1);
        const dayInMillis = 86400000; // Millisecondes dans un jour
        const daysOffset = (data.week_number - 1) * 7;
        return new Date(firstDayOfYear.getTime() + daysOffset * dayInMillis);
    };

    // Filtrer les données où le temps est supérieur à 180 minutes (3 heures)
    const filteredData = timeAnalysisData
        .map(d => ({
            date: parseWeekData(d),
            avgWaitingTime: parseFloat(d.avg_waiting_time_minutes),
            avgPatientTime: parseFloat(d.avg_patient_time_minutes)
        }))
        .filter(d => d.avgWaitingTime <= 180 && d.avgPatientTime <= 180); // Ignorer les données > 3 heures

    const x = d3.scaleTime()
        .domain(d3.extent(filteredData, d => d.date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => Math.max(d.avgWaitingTime, d.avgPatientTime))])
        .range([height, 0]);

    // Axe X
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(6));

    // Axe Y
    g.append('g')
        .call(d3.axisLeft(y));

    // Ajouter des lignes de seuil (20, 40, 60 minutes)
    const thresholdLines = [
        { value: 20, color: 'green', label: '20 minutes' },
        { value: 40, color: 'orange', label: '40 minutes' },
        { value: 60, color: 'red', label: '60 minutes' }
    ];

    thresholdLines.forEach(line => {
        g.append('line')
            .attr('x1', 0)
            .attr('y1', y(line.value))
            .attr('x2', width)
            .attr('y2', y(line.value))
            .attr('stroke', line.color)
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4 2'); // Ligne en pointillés

        // Ajouter un label pour la ligne de seuil
        g.append('text')
            .attr('x', width - 60)
            .attr('y', y(line.value) - 5)
            .attr('fill', line.color)
            .text(line.label);
    });

    // Ligne pour le temps d'attente
    const lineWaitingTime = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.avgWaitingTime));

    g.append('path')
        .datum(filteredData)
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 2)
        .attr('d', lineWaitingTime);

    // Ligne pour le temps patient
    const linePatientTime = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.avgPatientTime));

    g.append('path')
        .datum(filteredData)
        .attr('fill', 'none')
        .attr('stroke', 'green')
        .attr('stroke-width', 2)
        .attr('d', linePatientTime);

    // Ajout des labels
    g.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom)
        .attr('text-anchor', 'middle')
        .text('Date');

    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -margin.left + 15)
        .attr('text-anchor', 'middle')
        .text('Temps (minutes)');

    // Ajout des légendes
    const legend = g.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width + 100}, ${margin.top})`);

    // Légende Temps d'attente
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 18)
        .attr('height', 18)
        .style('fill', 'steelblue');

    legend.append('text')
        .attr('x', 25)
        .attr('y', 12)
        .attr('dy', '0.35em')
        .text('Temps d\'attente');

    // Légende Temps patient
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 25)
        .attr('width', 18)
        .attr('height', 18)
        .style('fill', 'green');

    legend.append('text')
        .attr('x', 25)
        .attr('y', 37)
        .attr('dy', '0.35em')
        .text('Temps patient');
}
