import { checkAuth, calculatePeriodMonths} from "../utilities/utils.js";
// Fonction pour charger et afficher les données des médecins avec filtrage par dates
export function loadMedecinsData(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');

    fetch(`/api/medecins?startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, // Ajouter le token JWT dans l'en-tête Authorization
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Remplir le tableau
        const tableBody = document.querySelector('#medecins-table tbody');
        tableBody.innerHTML = ''; // Effacer les données précédentes

        data.forEach(d => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${d.lastName} ${d.firstName}</td>
                <td class="text-right">${d.Consultations}</td>
                <td class="text-right">${d.Montant} €</td> 
                <td class="text-right">${d.cout_par_consultation} €</td>
                <td class="text-right">${d.total_hours} heures</td>
                <td class="text-right">${d.tarif_par_heure} €</td>
            `;
            tableBody.appendChild(row);
        });

        // Calculer la durée de la période sélectionnée en mois
        const periodMonths = calculatePeriodMonths(startDate, endDate);

        // Générer le graphique après avoir chargé les données
        generateGraph(data, periodMonths);
    })
    .catch(error => console.error('Erreur lors de la récupération des données:', error));
}

// Fonction pour générer le graphique comparant tarif par heure et nombre d'heures travaillées
function generateGraph(data, periodMonths) {
    // Trier les médecins par nombre d'heures travaillées
    data.sort((a, b) => b.total_hours - a.total_hours); // Tri descendant

    const svg = d3.select('#tarif-heure-chart');
    const margin = {top: 40, right: 30, bottom: 60, left: 60};
    const width = +svg.attr('width') - margin.left - margin.right;
    const height = +svg.attr('height') - margin.top - margin.bottom;
    svg.selectAll("*").remove(); // Effacer l'ancien graphique
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Définir une échelle de 0 à 2 * months * 45 pour l'axe Y
    const yMax = 2 * periodMonths * 45; // 2 fois la moyenne de 45 heures par mois
    const x = d3.scaleBand().domain(data.map(d => `${d.lastName} ${d.firstName}`)).range([0, width]).padding(0.2);
    const yLeft = d3.scaleLinear().domain([0, yMax]).nice().range([height, 0]);
    const yRight = d3.scaleLinear().domain([0, d3.max(data, d => d.tarif_par_heure)]).nice().range([height, 0]);

    // Créer le tooltip
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip') // Utiliser votre CSS global
        .style('opacity', 0);

    // Ajouter les barres pour les heures travaillées
    g.selectAll('.bar-hours')
        .data(data)
        .enter().append('rect')
        .attr('class', 'bar-hours')
        .attr('x', d => x(`${d.lastName} ${d.firstName}`))
        .attr('y', d => yLeft(d.total_hours))
        .attr('width', x.bandwidth())
        .attr('height', d => height - yLeft(d.total_hours))
        .attr('fill', 'steelblue')
        // Ajouter les événements pour afficher et masquer le tooltip
        .on('mouseover', function(event, d) {
            tooltip.style('opacity', 1); // Afficher le tooltip
        })
        .on('mousemove', function(event, d) {
            tooltip.html(`Heures travaillées : ${d.total_hours} heures`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 20) + 'px');
        })
        .on('mouseout', function() {
            tooltip.style('opacity', 0); // Masquer le tooltip
        });

    // Ajouter la ligne pour le tarif par heure
    const line = d3.line()
        .x(d => x(`${d.lastName} ${d.firstName}`) + x.bandwidth() / 2)
        .y(d => yRight(d.tarif_par_heure));

    g.append('path')
        .datum(data)
        .attr('class', 'line-tarif')
        .attr('fill', 'none')
        .attr('stroke', 'orange')
        .attr('stroke-width', 2)
        .attr('d', line);

    // Ajouter une ligne horizontale pour les 45 heures moyennes, adaptées à la période sélectionnée
    const adjustedHours = 45 * periodMonths; // 45 heures par mois, ajusté par le nombre de mois dans la période
    g.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', yLeft(adjustedHours)) // Position adaptée
        .attr('y2', yLeft(adjustedHours))
        .attr('stroke', 'red')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '4'); // Ligne en pointillés

    // Axe X
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-30)')
        .style('text-anchor', 'end');

    // Axe Y gauche (heures travaillées)
    g.append('g')
        .call(d3.axisLeft(yLeft))
        .append('text')
        .attr('fill', '#000')
        .attr('x', 5)
        .attr('y', -10)
        .text('Heures Travaillées');

    // Axe Y droit (tarif par heure)
    g.append('g')
        .attr('transform', `translate(${width},0)`)
        .call(d3.axisRight(yRight))
        .append('text')
        .attr('fill', '#000')
        .attr('x', -5)
        .attr('y', -10)
        .attr('text-anchor', 'end')
        .text('Tarif par Heure (€)');
}

