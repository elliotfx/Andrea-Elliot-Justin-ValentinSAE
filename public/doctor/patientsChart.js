// Fonction pour mettre à jour le graphique d'analyse des patients
export function updatePatientAnalysisChart(stats) {
    // Supprimer les anciens éléments du graphique
    d3.select("#patients-chart").selectAll("*").remove();

    // Définir les marges et dimensions du graphique
    const margin = { top: 30, right: 70, bottom: 50, left: 70 };
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Sélectionner ou créer le conteneur SVG
    const svg = d3.select("#patients-chart")
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
        .style('pointer-events', 'none'); // Pour éviter que la souris ne déclenche d'autres événements sur le tooltip

    // Préparer les données pour le graphique
    const months = Object.keys(stats);
    const data = months.map(month => {
        const newPatients = stats[month].stats.newPatients;
        const patientsPremiereVisite = stats[month].stats.patientsPremiereVisite;
        const otherNewPatients = newPatients - patientsPremiereVisite;
        const loyalPatients = stats[month].stats.loyalPatients;
        const totalPatients = newPatients + loyalPatients;
        const patientsPasRetour = stats[month].stats.patientsPasRetour;

        return {
            month: month,
            patientsPremiereVisite: patientsPremiereVisite,
            otherNewPatients: otherNewPatients,
            loyalPatients: loyalPatients,
            totalPatients: totalPatients,
            patientsPasRetour: patientsPasRetour
        };
    });

    // Créer les échelles
    const x = d3.scaleBand()
        .domain(data.map(d => d.month))
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => Math.max(d.totalPatients, d.patientsPasRetour))])
        .nice()
        .range([height, 0]);

    // Ajouter l'axe X
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));

    // Ajouter l'axe Y
    svg.append('g')
        .call(d3.axisLeft(y));

    // Palette de couleurs
    const color = d3.scaleOrdinal()
        .domain(['patientsPremiereVisite', 'otherNewPatients', 'loyalPatients'])
        .range(['#00A5CF', '#FFA500', '#4CAF50']); // Couleurs pour 'patientsPremiereVisite', 'Patients d'autres médecins', 'patients fidèles'

    // Empiler les données pour les barres empilées
    const stackedData = d3.stack()
        .keys(['patientsPremiereVisite', 'otherNewPatients', 'loyalPatients'])
        .order(d3.stackOrderReverse) // Inverser l'ordre pour avoir loyalPatients en haut
        (data);

    // Ajouter les barres empilées pour totalPatients
    svg.selectAll('.serie')
        .data(stackedData)
        .enter()
        .append('g')
        .attr('class', 'serie')
        .attr('fill', d => color(d.key))
        .selectAll('rect')
        .data(d => d)
        .enter()
        .append('rect')
        .attr('x', d => x(d.data.month))
        .attr('y', d => y(d[1]))
        .attr('height', d => y(d[0]) - y(d[1]))
        .attr('width', x.bandwidth() / 2)
        .on('mouseover', function(event, d) {
            tooltip.transition().duration(200).style('opacity', .9);
            tooltip.html(`
                <strong>Mois :</strong> ${d.data.month}<br>
                <strong>Total Patients :</strong> ${d.data.totalPatients}<br>
                <strong>Première Visite :</strong> ${d.data.patientsPremiereVisite}<br>
                <strong>Patients d'autres médecins :</strong> ${d.data.otherNewPatients}<br>
                <strong>Fidèles :</strong> ${d.data.loyalPatients}
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            tooltip.transition().duration(500).style('opacity', 0);
        });

    // Ajouter les barres pour patientsPasRetour
    svg.selectAll('.patientsPasRetour')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'patientsPasRetour')
        .attr('x', d => x(d.month) + x.bandwidth() / 2)
        .attr('y', d => y(d.patientsPasRetour))
        .attr('height', d => height - y(d.patientsPasRetour))
        .attr('width', x.bandwidth() / 2)
        .attr('fill', '#D29800')
        .on('mouseover', function(event, d) {
            tooltip.transition().duration(200).style('opacity', .9);
            tooltip.html(`
                <strong>Mois :</strong> ${d.month}<br>
                <strong>Patients sans Retour :</strong> ${d.patientsPasRetour}
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            tooltip.transition().duration(500).style('opacity', 0);
        });

    // Ajouter les pourcentages à l'intérieur des barres empilées
    svg.selectAll('.serie')
        .selectAll('text')
        .data(d => d)
        .enter()
        .append('text')
        .attr('x', d => x(d.data.month) + x.bandwidth() / 4)
        .attr('y', d => y(d[0]) - (y(d[0]) - y(d[1])) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .style('font-size', '10px')
        .text(d => {
            const value = d[1] - d[0];
            const percentage = (value / d.data.totalPatients * 100).toFixed(1);
            return `${percentage}%`;
        });

    // Ajouter les pourcentages à l'intérieur des barres de patientsPasRetour
    svg.selectAll('.patientsPasRetourText')
        .data(data)
        .enter()
        .append('text')
        .attr('x', d => x(d.month) + (x.bandwidth() * 3) / 4)
        .attr('y', d => y(d.patientsPasRetour) + (height - y(d.patientsPasRetour)) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .style('font-size', '10px')
        .text(d => {
            const percentage = (d.patientsPasRetour / d.totalPatients * 100).toFixed(1);
            return `${percentage}%`;
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
        .text('Nombre de Patients');

    // Ajouter une légende
    const legend = svg.append('g')
                      .attr('class', 'legend')
                      .attr('transform', `translate(${width - 10}, ${margin.top})`);

    // Légende pour Patients Fidèles
    legend.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 18)
          .attr('height', 18)
          .style('fill', color('loyalPatients'));

    legend.append('text')
          .attr('x', 25)
          .attr('y', 12)
          .attr('dy', '0.35em')
          .text('Patients Fidèles');

    // Légende pour Nouveaux Patients
    legend.append('rect')
          .attr('x', 0)
          .attr('y', 25)
          .attr('width', 18)
          .attr('height', 18)
          .style('fill', color('otherNewPatients'));

    legend.append('text')
          .attr('x', 25)
          .attr('y', 37)
          .attr('dy', '0.35em')
          .text('Patients d\'autres médecins');

    // Légende pour Patients Première Visite
    legend.append('rect')
          .attr('x', 0)
          .attr('y', 50)
          .attr('width', 18)
          .attr('height', 18)
          .style('fill', color('patientsPremiereVisite'));

    legend.append('text')
          .attr('x', 25)
          .attr('y', 62)
          .attr('dy', '0.35em')
          .text('Patients Première Visite');

    // Légende pour Patients sans Retour
    legend.append('rect')
          .attr('x', 0)
          .attr('y', 75)
          .attr('width', 18)
          .attr('height', 18)
          .style('fill', '#D29800');

    legend.append('text')
          .attr('x', 25)
          .attr('y', 87)
          .attr('dy', '0.35em')
          .text('Patients sans Retour');
}

