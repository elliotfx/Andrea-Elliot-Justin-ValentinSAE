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
        return {
            month: month,
            totalVisits: stats[month].stats.totalVisits,
            visitsGeneratedByNewPatients: stats[month].stats.visitsGeneratedByNewPatients,
            VisitsByNewPatientsClinic: stats[month].stats.VisitsByNewPatientsClinic,
            followUpVisits: stats[month].stats.followUpVisits,
            uniquePatients: stats[month].stats.uniquePatients,
            newPatients: stats[month].stats.newPatients,
            loyalPatients: stats[month].stats.loyalPatients,
            patientsPremiereVisite: stats[month].stats.patientsPremiereVisite
        };
    });

    // Créer les échelles
    const x0 = d3.scaleBand()
        .domain(data.map(d => d.month))
        .range([0, width])
        .padding(0.2);

    const x1 = d3.scaleBand()
        .domain(['totalVisits', 'visitsGeneratedByNewPatients', 'VisitsByNewPatientsClinic', 'followUpVisits'])
        .range([0, x0.bandwidth()])
        .padding(0.05);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => Math.max(d.totalVisits, d.visitsGeneratedByNewPatients, d.VisitsByNewPatientsClinic, d.followUpVisits))])
        .nice()
        .range([height, 0]);

    // Ajouter le second axe Y pour le taux de rendez-vous par patient
    const y2 = d3.scaleLinear()
        .domain([0, d3.max(data, d => Math.max(
            d.totalVisits / d.uniquePatients,
            d.visitsGeneratedByNewPatients / d.newPatients,
            d.VisitsByNewPatientsClinic / d.patientsPremiereVisite,
            d.followUpVisits / d.loyalPatients
        ))])
        .nice()
        .range([height, 0]);

    // Palette de couleurs pour les barres
    const color = d3.scaleOrdinal()
        .domain(['totalVisits', 'visitsGeneratedByNewPatients', 'VisitsByNewPatientsClinic', 'followUpVisits'])
        .range(['#4CAF50', '#00A5CF', '#FFA500', '#D29800']);

    // Couleurs pour les courbes
    const lineColors = {
        totalVisits: '#1f77b4',      // Bleu
        visitsGeneratedByNewPatients: '#ff7f0e',  // Orange
        VisitsByNewPatientsClinic: '#2ca02c',  // Vert
        followUpVisits: '#d62728'   // Rouge
    };

    // Ajouter l'axe X
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x0));

    // Ajouter l'axe Y pour le nombre de visites
    svg.append('g')
        .call(d3.axisLeft(y));

    // Ajouter l'axe Y2 pour le taux de rendez-vous par patient
    svg.append('g')
        .attr('transform', `translate(${width},0)`)
        .call(d3.axisRight(y2));

    // Ajouter les barres pour chaque catégorie
    const categories = ['totalVisits', 'visitsGeneratedByNewPatients', 'VisitsByNewPatientsClinic', 'followUpVisits'];

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
            month: d.month,
            patients: getPatientsForCategory(d, key),
            rate: (d[key] / getPatientsForCategory(d, key)).toFixed(2)  // Calcul du taux
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
                <strong>${getLabelForKey(d.key)} :</strong> ${d.value}<br>
                <strong>Nombre de Patients :</strong> ${d.patients}<br>
                <strong>Taux de rendez-vous :</strong> ${d.rate}
            `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function () {
            tooltip.transition().duration(500).style('opacity', 0);
        });

    // Ajouter les courbes pour le taux de rendez-vous par patient
    const lineGenerator = d3.line()
        .x(d => x0(d.month) + x0.bandwidth() / 2)
        .y(d => y2(d.ratio));

    categories.forEach(key => {
        const ratioData = data.map(d => ({
            month: d.month,
            ratio: d[key] / getPatientsForCategory(d, key)
        }));

        svg.append('path')
            .datum(ratioData)
            .attr('fill', 'none')
            .attr('stroke', lineColors[key])  // Utilisation des nouvelles couleurs pour les courbes
            .attr('stroke-width', 2)
            .attr('d', lineGenerator);
    });

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
        .text('Nombre de Visites');

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', width + margin.right - 30)
        .attr('text-anchor', 'middle')
        .text('Taux de rendez-vous par patient');

    // Ajouter une légende
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width + 100}, ${margin.top})`);

    // Légende pour Visites Totales (barre et courbe)
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 18)
        .attr('height', 18)
        .style('fill', color('totalVisits'));
    legend.append('text')
        .attr('x', 25)
        .attr('y', 12)
        .attr('dy', '0.35em')
        .text('Visites Totales');

    legend.append('line')
        .attr('x1', 0)
        .attr('y1', 25)
        .attr('x2', 18)
        .attr('y2', 25)
        .attr('stroke', lineColors.totalVisits)
        .attr('stroke-width', 2);
    legend.append('text')
        .attr('x', 25)
        .attr('y', 30)
        .attr('dy', '0.35em');

    // Légende pour Nouveaux Patients (Médecin)
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 50)
        .attr('width', 18)
        .attr('height', 18)
        .style('fill', color('visitsGeneratedByNewPatients'));
    legend.append('text')
        .attr('x', 25)
        .attr('y', 62)
        .attr('dy', '0.35em')
        .append('tspan')
        .attr('x', 25)
        .attr('dy', '1.2em')  // Position pour la première ligne
        .text('Nouveaux Patients')
        .append('tspan')
        .attr('x', 25)
        .attr('dy', '1.2em')  // Position pour la seconde ligne
        .text('(Médecin)');

    legend.append('line')
        .attr('x1', 0)
        .attr('y1', 75)
        .attr('x2', 18)
        .attr('y2', 75)
        .attr('stroke', lineColors.visitsGeneratedByNewPatients)
        .attr('stroke-width', 2);
    legend.append('text')
        .attr('x', 25)
        .attr('y', 80)
        .attr('dy', '0.35em');

    // Légende pour Nouveaux Patients (Clinique)
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 100)
        .attr('width', 18)
        .attr('height', 18)
        .style('fill', color('VisitsByNewPatientsClinic'));
    legend.append('text')
        .attr('x', 25)
        .attr('y', 112)
        .attr('dy', '0.35em')
        .append('tspan')
        .attr('x', 25)
        .attr('dy', '1.2em')  // Position pour la première ligne
        .text('Nouveaux Patients')
        .append('tspan')
        .attr('x', 25)
        .attr('dy', '1.2em')  // Position pour la seconde ligne
        .text('(Clinique)');
    

    legend.append('line')
        .attr('x1', 0)
        .attr('y1', 125)
        .attr('x2', 18)
        .attr('y2', 125)
        .attr('stroke', lineColors.VisitsByNewPatientsClinic)
        .attr('stroke-width', 2);
    legend.append('text')
        .attr('x', 25)
        .attr('y', 130)
        .attr('dy', '0.35em');

    // Légende pour Patients Fidélisés
    legend.append('rect')
        .attr('x', 0)
        .attr('y', 150)
        .attr('width', 18)
        .attr('height', 18)
        .style('fill', color('followUpVisits'));
    legend.append('text')
        .attr('x', 25)
        .attr('y', 162)
        .attr('dy', '0.35em')
        .text('Patients Fidélisés');

    legend.append('line')
        .attr('x1', 0)
        .attr('y1', 175)
        .attr('x2', 18)
        .attr('y2', 175)
        .attr('stroke', lineColors.followUpVisits)
        .attr('stroke-width', 2);
    legend.append('text')
        .attr('x', 25)
        .attr('y', 180)
        .attr('dy', '0.35em');
}


// Fonction pour obtenir le nombre de patients associés à chaque catégorie
function getPatientsForCategory(d, category) {
    switch (category) {
        case 'totalVisits':
            return d.uniquePatients;
        case 'visitsGeneratedByNewPatients':
            return d.newPatients;
        case 'VisitsByNewPatientsClinic':
            return d.patientsPremiereVisite;
        case 'followUpVisits':
            return d.loyalPatients;
        default:
            return 0;
    }
}

// Fonction pour obtenir le label d'une catégorie
function getLabelForKey(key) {
    switch (key) {
        case 'totalVisits':
            return 'Visites Totales';
        case 'visitsGeneratedByNewPatients':
            return 'Nouveaux Patients (Médecin)';
        case 'VisitsByNewPatientsClinic':
            return 'Nouveaux Patients (Clinique)';
        case 'followUpVisits':
            return 'Patients Fidélisés';
        default:
            return key;
    }
}
