// Fonction pour récupérer le token JWT
function getAuthToken() {
    return localStorage.getItem('token');
}

// Fonction pour créer le diagramme circulaire des genres
async function createGenderPieChart() {
    try {
        const token = getAuthToken();
        const response = await fetch('http://localhost:3000/api/profiling/gender', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erreur réponse serveur:', response.status, errorText);
            throw new Error(`Erreur ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Données genre reçues:', data);
        
        if (!data || data.length === 0) {
            d3.select('#gender-chart').html('<p style="color: #999;">Aucune donnée disponible</p>');
            return;
        }
        
        // Dimensions du graphique
        const width = 300;
        const height = 300;
        const radius = Math.min(width, height) / 2;
        
        // Nettoyer le conteneur
        d3.select('#gender-chart').html('');
        
        // Créer le SVG
        const svg = d3.select('#gender-chart')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);
        
        // Palette de couleurs
        const color = d3.scaleOrdinal()
            .domain(data.map(d => d.gender))
            .range(['#257cc7ff', '#9e1e98ff']);
        
        // Générateur de pie
        const pie = d3.pie()
            .value(d => d.count)
            .sort(null);
        
        // Générateur d'arc
        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(radius - 10);
        
        const arcHover = d3.arc()
            .innerRadius(0)
            .outerRadius(radius);
        
        // Créer les arcs
        const arcs = svg.selectAll('arc')
            .data(pie(data))
            .enter()
            .append('g')
            .attr('class', 'arc');
        
        arcs.append('path')
            .attr('d', arc)
            .attr('fill', d => color(d.data.gender))
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('d', arcHover);
            })
            .on('mouseout', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('d', arc);
            });
        
        // Ajouter les labels
        arcs.append('text')
            .attr('transform', d => `translate(${arc.centroid(d)})`)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .attr('font-weight', 'bold')
            .style('font-size', '14px')
            .text(d => d.data.gender);
        
        // Ajouter les pourcentages
        const total = d3.sum(data, d => d.count);
        arcs.append('text')
            .attr('transform', d => {
                const pos = arc.centroid(d);
                return `translate(${pos[0]}, ${pos[1] + 18})`;
            })
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .style('font-size', '12px')
            .text(d => `${((d.data.count / total) * 100).toFixed(1)}%`);
        
    } catch (error) {
        console.error('Erreur lors de la création du graphique des genres:', error);
        d3.select('#gender-chart').html('<p style="color: red;">Erreur lors du chargement des données</p>');
    }
}

// Fonction pour créer le graphique des tranches d'âge
async function createAgeGroupsChart() {
    try {
        const token = getAuthToken();
        const response = await fetch('http://localhost:3000/api/profiling/age-groups', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erreur réponse serveur:', response.status, errorText);
            throw new Error(`Erreur ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Données tranches d\'âge reçues:', data);
        
        if (!data || data.length === 0) {
            d3.select('#age-groups-chart').html('<p style="color: #999;">Aucune donnée disponible</p>');
            return;
        }
        
        // Dimensions du graphique
        const margin = { top: 20, right: 20, bottom: 60, left: 70 };
        const width = 450 - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;
        
        // Nettoyer le conteneur
        d3.select('#age-groups-chart').html('');
        
        // Créer le SVG
        const svg = d3.select('#age-groups-chart')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
        
        // Échelles
        const x = d3.scaleBand()
            .domain(data.map(d => d.age_group))
            .range([0, width])
            .padding(0.2);
        
        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count)])
            .nice()
            .range([height, 0]);
        
        // Gradient pour les barres
        const gradient = svg.append('defs')
            .append('linearGradient')
            .attr('id', 'bar-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');
        
        gradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#d8a928ff');
        
        gradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#ca7628ff');
        
        // Créer les barres
        svg.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.age_group))
            .attr('y', height)
            .attr('width', x.bandwidth())
            .attr('height', 0)
            .attr('fill', 'url(#bar-gradient)')
            .attr('rx', 4)
            .transition()
            .duration(800)
            .attr('y', d => y(d.count))
            .attr('height', d => height - y(d.count));
        
        // Ajouter les valeurs sur les barres
        svg.selectAll('.label')
            .data(data)
            .enter()
            .append('text')
            .attr('class', 'label')
            .attr('x', d => x(d.age_group) + x.bandwidth() / 2)
            .attr('y', d => y(d.count) - 5)
            .attr('text-anchor', 'middle')
            .attr('fill', '#333')
            .attr('font-weight', 'bold')
            .style('font-size', '14px')
            .style('opacity', 0)
            .text(d => d.count)
            .transition()
            .delay(800)
            .duration(400)
            .style('opacity', 1);
        
        // Axe X
        svg.append('g')
            .attr('transform', `translate(0, ${height})`)
            .call(d3.axisBottom(x))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end')
            .attr('dx', '-0.8em')
            .attr('dy', '0.15em')
            .style('font-size', '12px');
        
        // Axe Y
        svg.append('g')
            .call(d3.axisLeft(y).ticks(5))
            .style('font-size', '12px');
        
        // Label de l'axe Y
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left + 10)
            .attr('x', 0 - (height / 2))
            .attr('dy', '0em')
            .style('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('fill', '#666')
            .text('Nombre de patients');
        
    } catch (error) {
        console.error('Erreur lors de la création du graphique des tranches d\'âge:', error);
        d3.select('#age-groups-chart').html('<p style="color: red;">Erreur lors du chargement des données</p>');
    }
}

// Initialiser les graphiques au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initialisation des graphiques de profiling...');
    const token = getAuthToken();
    if (!token) {
        console.error('Aucun token trouvé - redirection vers login');
        d3.select('#gender-chart').html('<p style="color: red;">Veuillez vous connecter</p>');
        d3.select('#age-groups-chart').html('<p style="color: red;">Veuillez vous connecter</p>');
        return;
    }
    console.log('Token trouvé, chargement des données...');
    createGenderPieChart();
    createAgeGroupsChart();
});
