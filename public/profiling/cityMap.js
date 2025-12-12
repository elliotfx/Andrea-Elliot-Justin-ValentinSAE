// cityMap.js - Visualisation D3.js avec fond de carte et cache de coordonnées

document.addEventListener('DOMContentLoaded', async function () {
    try {
        // Récupérer le token d'authentification
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('Token non trouvé');
            return;
        }

        // Récupérer les données de distribution par ville
        const response = await fetch('/api/city-distribution', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des données');
        }

        const cityData = await response.json();
        console.log(`🗺️ ${cityData.length} villes récupérées`);

        // Charger les coordonnées depuis le cache
        const coordsResponse = await fetch('/profiling/cityCoordinates.json');
        const coordsCache = await coordsResponse.json();
        console.log('📍 Cache de coordonnées chargé');

        // Dimensions de la carte
        const container = document.getElementById('city-map');
        const width = container.offsetWidth;
        const height = 500;

        // Clear any existing content
        container.innerHTML = '';

        // Créer le conteneur avec fond de carte
        const mapDiv = d3.select('#city-map')
            .append('div')
            .style('position', 'relative')
            .style('width', width + 'px')
            .style('height', height + 'px')
            .style('border-radius', '8px')
            .style('overflow', 'hidden');

        // Ajouter le fond de carte OpenStreetMap
        const tileLayer = mapDiv.append('div')
            .style('position', 'absolute')
            .style('top', '0')
            .style('left', '0')
            .style('width', '100%')
            .style('height', '100%')
            .style('z-index', '1');

        // Initialiser la carte Leaflet en arrière-plan
        const bgMap = L.map(tileLayer.node(), {
            zoomControl: true,  // Activer les contrôles de zoom
            attributionControl: false,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            dragging: true
        }).setView([46.3236, -0.4600], 10);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            opacity: 0.6
        }).addTo(bgMap);

        console.log('🗺️ Fond de carte ajouté avec zoom activé');

        // Créer le SVG pour les cercles AU-DESSUS de la carte
        const svg = mapDiv.append('svg')
            .style('position', 'absolute')
            .style('top', '0')
            .style('left', '0')
            .style('width', '100%')
            .style('height', '100%')
            .style('z-index', '2')
            .style('pointer-events', 'none');

        // Groupe pour les cercles
        const circlesGroup = svg.append('g')
            .style('pointer-events', 'all');

        console.log(`📐 SVG overlay créé: ${width}x${height}`);

        // Projection géographique centrée sur Niort
        const projection = d3.geoMercator()
            .center([-0.4600, 46.3236])
            .scale(80000)
            .translate([width / 2, height / 2]);

        // Trouver le nombre maximum de patients
        const maxCount = d3.max(cityData, d => d.count);
        const minCount = d3.min(cityData, d => d.count);
        console.log(`📊 Plage de patients: ${minCount} - ${maxCount}`);

        // Échelles de couleur et taille
        const colorScale = d3.scaleSequential()
            .domain([minCount, maxCount])
            .interpolator(d3.interpolateBlues);

        const radiusScale = d3.scaleSqrt()
            .domain([minCount, maxCount])
            .range([8, 25]); // Rayons en pixels

        // Afficher les villes INSTANTANÉMENT (pas de délai!)
        console.log('🎨 Affichage des cercles...');
        let displayedCount = 0;

        for (const city of cityData) {
            const coords = coordsCache[city.city];

            if (coords) {
                const [x, y] = projection([coords.lon, coords.lat]);

                // Ajouter le cercle
                const circle = circlesGroup.append('circle')
                    .attr('cx', x)
                    .attr('cy', y)
                    .attr('r', radiusScale(city.count))
                    .attr('fill', colorScale(city.count))
                    .attr('stroke', '#1565C0')
                    .attr('stroke-width', 2)
                    .attr('opacity', 0)
                    .style('cursor', 'pointer')
                    .datum({ lon: coords.lon, lat: coords.lat, count: city.count });

                // Animation d'apparition
                circle.transition()
                    .duration(300)
                    .delay(displayedCount * 50) // 50ms entre chaque cercle
                    .attr('opacity', 0.8);

                // Ajouter tooltip
                circle.append('title')
                    .text(`${city.city}: ${city.count} patients`);

                // Événements hover
                circle.on('mouseenter', function () {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr('opacity', 1)
                        .attr('stroke-width', 4)
                        .attr('r', radiusScale(city.count) * 1.2);
                })
                    .on('mouseleave', function () {
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .attr('opacity', 0.8)
                            .attr('stroke-width', 2)
                            .attr('r', radiusScale(city.count));
                    });

                displayedCount++;
            } else {
                console.warn(`⚠️ Coordonnées manquantes pour "${city.city}"`);
            }
        }

        console.log(`%c✅ ${displayedCount}/${cityData.length} villes affichées instantanément!`, 'color: green; font-weight: bold; font-size: 14px');

        // Fonction pour mettre à jour les positions des cercles lors du zoom
        function updateCirclePositions() {
            const zoom = bgMap.getZoom();
            const center = bgMap.getCenter();

            // Calculer la nouvelle échelle basée sur le zoom Leaflet
            const scale = 256 * Math.pow(2, zoom) / (2 * Math.PI);

            //Mettre à jour la projection
            projection
                .center([center.lng, center.lat])
                .scale(scale)
                .translate([width / 2, height / 2]);

            // Repositionner tous les cercles
            circlesGroup.selectAll('circle').each(function () {
                const d = d3.select(this).datum();
                if (d) {
                    const [x, y] = projection([d.lon, d.lat]);
                    d3.select(this)
                        .attr('cx', x)
                        .attr('cy', y);
                }
            });
        }

        // Écouter les événements Leaflet
        bgMap.on('zoomend moveend', updateCirclePositions);
        console.log('🔄 Synchronisation du zoom activée!');

        // Ajouter une légende
        const legendWidth = 200;
        const legendHeight = 20;
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width - legendWidth - 40}, ${height - 90})`); // Plus d'espace depuis les bords


        // Fond de la légende
        legend.append('rect')
            .attr('width', legendWidth + 20)
            .attr('height', 70)
            .attr('fill', 'white')
            .attr('fill-opacity', 0.9)
            .attr('stroke', '#ccc')
            .attr('rx', 5);

        // Gradient pour la légende
        const defs = svg.append('defs');
        const linearGradient = defs.append('linearGradient')
            .attr('id', 'legend-gradient');

        linearGradient.selectAll('stop')
            .data(d3.range(0, 1.1, 0.1))
            .enter()
            .append('stop')
            .attr('offset', d => `${d * 100}%`)
            .attr('stop-color', d => colorScale(minCount + d * (maxCount - minCount)));

        legend.append('rect')
            .attr('x', 10)
            .attr('y', 30)
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#legend-gradient)')
            .attr('stroke', '#666');

        legend.append('text')
            .attr('x', 10)
            .attr('y', 20)
            .text('Nombre de patients')
            .style('font-size', '12px')
            .style('font-weight', 'bold');

        legend.append('text')
            .attr('x', 10)
            .attr('y', 65)
            .text(minCount)
            .style('font-size', '10px');

        legend.append('text')
            .attr('x', legendWidth - 10)
            .attr('y', 65)
            .attr('text-anchor', 'end')
            .text(maxCount)
            .style('font-size', '10px');

    } catch (error) {
        console.error('❌ Erreur lors du chargement de la carte:', error);
        document.getElementById('city-map').innerHTML =
            '<div style="display: flex; align-items: center; justify-content: center; height: 500px; color: #666;">' +
            '<p>Erreur lors du chargement de la carte des villes</p>' +
            '</div>';
    }
});
