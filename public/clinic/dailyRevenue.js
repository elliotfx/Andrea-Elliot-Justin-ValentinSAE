import { checkAuth } from '../utilities/utils.js';

// Vérifier l'authentification
checkAuth();

// Fonction pour récupérer les dates sélectionnées
function getSelectedDates() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    return { startDate, endDate };
}

// Fonction pour créer le graphique des revenus par jour de la semaine
async function createDailyRevenueChart() {
    const { startDate, endDate } = getSelectedDates();
    
    let url = '/api/daily-revenue';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            console.error('Erreur de réponse:', response.status);
            return;
        }
        
        const data = await response.json();
        
        console.log('Données reçues:', data);
        
        if (!data || data.length === 0) {
            console.log('Aucune donnée disponible');
            return;
        }

        // Définir les dimensions
        const margin = { top: 40, right: 120, bottom: 80, left: 80 };
        const width = 900 - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;

        // Nettoyer le SVG existant
        d3.select('#daily-revenue-chart').selectAll('*').remove();

        // Créer le SVG
        const svg = d3.select('#daily-revenue-chart')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Définir les jours dans le bon ordre
        const daysOrder = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        
        // Réorganiser et normaliser les données selon l'ordre des jours
        const orderedData = daysOrder.map(day => {
            const found = data.find(d => d.day_name === day);
            return found ? {
                day_name: found.day_name,
                total_visits: Number(found.total_visits) || 0,
                total_revenue: Number(found.total_revenue) || 0,
                avg_revenue_per_visit: Number(found.avg_revenue_per_visit) || 0
            } : {
                day_name: day,
                total_visits: 0,
                total_revenue: 0,
                avg_revenue_per_visit: 0
            };
        });

        const maxRevenue = d3.max(orderedData, d => Number(d.total_revenue) || 0) || 1;
        const maxVisits = d3.max(orderedData, d => Number(d.total_visits) || 0) || 1;

        // Créer les échelles
        const x = d3.scaleBand()
            .domain(orderedData.map(d => d.day_name))
            .range([0, width])
            .padding(0.2);

        const y = d3.scaleLinear()
            .domain([0, maxRevenue * 1.1])
            .nice()
            .range([height, 0]);

        const y2 = d3.scaleLinear()
            .domain([0, maxVisits * 1.1])
            .nice()
            .range([height, 0]);

        // Créer un gradient pour les barres
        const defs = svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'bar-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');

        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#667eea')
            .attr('stop-opacity', 1);

        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#764ba2')
            .attr('stop-opacity', 1);

        // Ajouter les axes
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('fill', '#333');

        svg.append('g')
            .call(d3.axisLeft(y).tickFormat(d => d.toLocaleString('fr-DZ') + ' DA'))
            .selectAll('text')
            .style('font-size', '11px')
            .style('fill', '#667eea');

        svg.append('g')
            .attr('transform', `translate(${width},0)`)
            .call(d3.axisRight(y2))
            .selectAll('text')
            .style('font-size', '11px')
            .style('fill', '#f39c12');

        // Ajouter les libellés des axes
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -60)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('fill', '#667eea')
            .text('Revenu Total (DA)');

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', width + 60)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('fill', '#f39c12')
            .text('Nombre de Visites');

        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height + 60)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('fill', '#333')
            .text('Jour de la Semaine');

        // Créer le tooltip
        const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background-color', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '10px')
            .style('border-radius', '5px')
            .style('pointer-events', 'none')
            .style('font-size', '12px');

        // Ajouter les barres avec animation
        svg.selectAll('.bar')
            .data(orderedData)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.day_name))
            .attr('width', x.bandwidth())
            .attr('y', height)
            .attr('height', 0)
            .attr('fill', 'url(#bar-gradient)')
            .attr('rx', 5)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style('opacity', 0.7);
                
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 1);
                tooltip.html(`
                    <strong>${d.day_name}</strong><br/>
                    Visites: ${Number(d.total_visits || 0)}<br/>
                    Revenu total: ${Number(d.total_revenue || 0).toLocaleString('fr-DZ')} DA<br/>
                    Revenu moyen/visite: ${Number(d.avg_revenue_per_visit || 0).toLocaleString('fr-DZ')} DA
                `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style('opacity', 1);
                
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            })
            .transition()
            .duration(800)
            .attr('y', d => y(Number(d.total_revenue) || 0))
            .attr('height', d => height - y(Number(d.total_revenue) || 0));

        // Ajouter la ligne pour le nombre de visites
        const line = d3.line()
            .x(d => x(d.day_name) + x.bandwidth() / 2)
            .y(d => y2(Number(d.total_visits) || 0))
            .curve(d3.curveMonotoneX);

        const path = svg.append('path')
            .datum(orderedData)
            .attr('fill', 'none')
            .attr('stroke', '#f39c12')
            .attr('stroke-width', 3)
            .attr('d', line);

        // Animation de la ligne
        const totalLength = path.node().getTotalLength();
        path
            .attr('stroke-dasharray', totalLength + ' ' + totalLength)
            .attr('stroke-dashoffset', totalLength)
            .transition()
            .duration(1500)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0);

        // Ajouter des points sur la ligne
        svg.selectAll('.dot')
            .data(orderedData)
            .enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('cx', d => x(d.day_name) + x.bandwidth() / 2)
            .attr('cy', d => y2(Number(d.total_visits) || 0))
            .attr('r', 0)
            .attr('fill', '#f39c12')
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 8);
                
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 1);
                tooltip.html(`
                    <strong>${d.day_name}</strong><br/>
                    Nombre de visites: ${d.total_visits}
                `)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 5);
                
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            })
            .transition()
            .delay(1500)
            .duration(300)
            .attr('r', 5);

        // Ajouter une légende
        const legend = svg.append('g')
            .attr('transform', `translate(${width - 100}, -20)`);

        legend.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', 'url(#bar-gradient)')
            .attr('rx', 2);

        legend.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .style('font-size', '12px')
            .style('fill', '#333')
            .text('Revenu');

        legend.append('circle')
            .attr('cx', 7)
            .attr('cy', 32)
            .attr('r', 5)
            .attr('fill', '#f39c12');

        legend.append('text')
            .attr('x', 20)
            .attr('y', 37)
            .style('font-size', '12px')
            .style('fill', '#333')
            .text('Visites');

    } catch (error) {
        console.error('Erreur lors de la création du graphique:', error);
    }
}

// Charger le graphique au chargement de la page
createDailyRevenueChart();

// Recharger le graphique lors du changement de période
document.getElementById('apply-period').addEventListener('click', () => {
    createDailyRevenueChart();
});
