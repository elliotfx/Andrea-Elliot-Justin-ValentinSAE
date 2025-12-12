// benchmarkRadarChart.js - Radar chart pour comparer les médecins

let benchmarkData = null;
let selectedDoctorId = null;

export async function loadBenchmarkChart() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    selectedDoctorId = document.getElementById('doctor-select').value;

    const token = localStorage.getItem('token');
    if (!token) {
        console.error('Utilisateur non authentifié');
        return;
    }

    try {
        const response = await fetch(`/api/doctor/benchmark?startDate=${startDate}&endDate=${endDate}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        benchmarkData = await response.json();
        renderRadarChart();
        setupComparisonSelector();
    } catch (error) {
        console.error('Erreur lors de la récupération des données de benchmark:', error);
    }
}

function setupComparisonSelector() {
    const container = document.getElementById('benchmark-comparison-selector');
    if (!container || !benchmarkData) return;

    // Créer les checkboxes pour sélectionner les médecins à comparer
    const currentDoctorId = selectedDoctorId;
    const otherDoctors = benchmarkData.doctors.filter(d => d.id != currentDoctorId);

    container.innerHTML = `
        <label style="font-weight: 500; margin-right: 10px;">Comparer avec :</label>
        <select id="compare-doctor-select" multiple style="min-width: 200px; padding: 5px;">
            <option value="moyenne" selected>Moyenne clinique</option>
            ${otherDoctors.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
        </select>
        <button id="update-benchmark-btn" style="margin-left: 10px; padding: 5px 15px; cursor: pointer;">Actualiser</button>
    `;

    document.getElementById('update-benchmark-btn').addEventListener('click', renderRadarChart);
}

function renderRadarChart() {
    const svg = d3.select("#benchmark-radar-chart");
    svg.selectAll("*").remove();

    if (!benchmarkData || !benchmarkData.doctors.length) {
        svg.append("text")
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("text-anchor", "middle")
            .text("Aucune donnée disponible");
        return;
    }

    // Configuration
    const width = 450;
    const height = 320;
    const margin = { top: 30, right: 100, bottom: 30, left: 30 };
    const radius = Math.min(width - margin.left - margin.right - 50, height - margin.top - margin.bottom) / 2;

    svg.attr("width", width)
       .attr("height", height)
       .attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g")
        .attr("transform", `translate(${(width - margin.right) / 2}, ${height / 2})`);

    // Métriques à afficher (avec labels français)
    const metrics = [
        { key: 'patients', label: 'Patients', inverse: false },
        { key: 'visites', label: 'Visites', inverse: false },
        { key: 'revenus', label: 'Revenus', inverse: false },
        { key: 'ponctualite', label: 'Ponctualité', inverse: false },
        { key: 'tempsAttente', label: 'Temps attente', inverse: true }, // Inversé: moins = mieux
        { key: 'dureeConsult', label: 'Durée consult.', inverse: false }
    ];

    const angleSlice = (Math.PI * 2) / metrics.length;

    // Échelle radiale
    const rScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, radius]);

    // Dessiner les cercles de fond
    const levels = 4;
    for (let i = 1; i <= levels; i++) {
        g.append("circle")
            .attr("r", radius * i / levels)
            .attr("fill", "none")
            .attr("stroke", "#ddd")
            .attr("stroke-width", 1);

        // Labels de pourcentage
        g.append("text")
            .attr("x", 3)
            .attr("y", -radius * i / levels)
            .attr("font-size", "8px")
            .attr("fill", "#999")
            .text(`${i * 25}%`);
    }

    // Dessiner les axes
    metrics.forEach((metric, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const lineX = radius * Math.cos(angle);
        const lineY = radius * Math.sin(angle);

        g.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", lineX)
            .attr("y2", lineY)
            .attr("stroke", "#ccc")
            .attr("stroke-width", 1);

        // Labels des métriques
        const labelX = (radius + 15) * Math.cos(angle);
        const labelY = (radius + 15) * Math.sin(angle);

        g.append("text")
            .attr("x", labelX)
            .attr("y", labelY)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "9px")
            .attr("font-weight", "500")
            .attr("fill", "#333")
            .text(metric.label);
    });

    // Obtenir le médecin sélectionné
    const currentDoctor = benchmarkData.doctors.find(d => d.id == selectedDoctorId);
    
    // Calculer la moyenne de la clinique
    const clinicAverage = {
        name: 'Moyenne clinique',
        metrics: {}
    };
    
    metrics.forEach(m => {
        const sum = benchmarkData.doctors.reduce((acc, d) => acc + (d.metrics[m.key] || 0), 0);
        clinicAverage.metrics[m.key] = sum / benchmarkData.doctors.length;
    });

    // Obtenir les médecins à comparer
    const compareSelect = document.getElementById('compare-doctor-select');
    let doctorsToCompare = [];
    
    if (compareSelect) {
        const selectedOptions = Array.from(compareSelect.selectedOptions).map(o => o.value);
        
        if (selectedOptions.includes('moyenne')) {
            doctorsToCompare.push({ ...clinicAverage, color: '#95A5A6' });
        }
        
        selectedOptions.filter(v => v !== 'moyenne').forEach(id => {
            const doc = benchmarkData.doctors.find(d => d.id == id);
            if (doc) {
                doctorsToCompare.push({ ...doc, color: getRandomColor(doc.id) });
            }
        });
    } else {
        doctorsToCompare.push({ ...clinicAverage, color: '#95A5A6' });
    }

    // Ajouter le médecin actuel
    if (currentDoctor) {
        doctorsToCompare.unshift({ ...currentDoctor, color: '#667eea' });
    }

    // Fonction pour normaliser les valeurs (0-100%)
    const normalizeValue = (value, metricKey, inverse) => {
        const maxVal = benchmarkData.maxValues[metricKey] || 1;
        let normalized = (value / maxVal) * 100;
        if (inverse) {
            // Pour les métriques inversées, une valeur plus basse est meilleure
            normalized = 100 - normalized;
        }
        return Math.min(100, Math.max(0, normalized));
    };

    // Générateur de ligne radar
    const radarLine = d3.lineRadial()
        .radius(d => rScale(d.value))
        .angle((d, i) => i * angleSlice)
        .curve(d3.curveLinearClosed);

    // Tooltip
    const tooltip = d3.select("body").selectAll(".radar-tooltip").data([0]);
    const tooltipEnter = tooltip.enter()
        .append("div")
        .attr("class", "radar-tooltip tooltip")
        .style("opacity", 0);
    const tooltipDiv = tooltip.merge(tooltipEnter);

    // Dessiner les polygones pour chaque médecin
    doctorsToCompare.forEach((doctor, idx) => {
        const dataPoints = metrics.map((m, i) => ({
            metric: m.label,
            rawValue: doctor.metrics[m.key] || 0,
            value: normalizeValue(doctor.metrics[m.key] || 0, m.key, m.inverse),
            angle: i * angleSlice
        }));

        // Polygone rempli
        g.append("path")
            .datum(dataPoints)
            .attr("d", radarLine)
            .attr("fill", doctor.color)
            .attr("fill-opacity", idx === 0 ? 0.3 : 0.1)
            .attr("stroke", doctor.color)
            .attr("stroke-width", idx === 0 ? 3 : 2)
            .style("cursor", "pointer")
            .on("mouseover", function(event) {
                d3.select(this).attr("fill-opacity", 0.5);
                tooltipDiv.transition().duration(200).style("opacity", 0.9);
                tooltipDiv.html(`<strong>${doctor.name}</strong>`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).attr("fill-opacity", idx === 0 ? 0.3 : 0.1);
                tooltipDiv.transition().duration(500).style("opacity", 0);
            });

        // Points sur les sommets (seulement pour le médecin principal)
        if (idx === 0) {
            dataPoints.forEach((point, i) => {
                const angle = angleSlice * i - Math.PI / 2;
                const x = rScale(point.value) * Math.cos(angle);
                const y = rScale(point.value) * Math.sin(angle);

                g.append("circle")
                    .attr("cx", x)
                    .attr("cy", y)
                    .attr("r", 5)
                    .attr("fill", doctor.color)
                    .attr("stroke", "white")
                    .attr("stroke-width", 2)
                    .style("cursor", "pointer")
                    .on("mouseover", function(event) {
                        tooltipDiv.transition().duration(200).style("opacity", 0.9);
                        let valueDisplay = point.rawValue;
                        if (metrics[i].key === 'revenus') {
                            valueDisplay = point.rawValue.toLocaleString('fr-FR') + ' €';
                        } else if (metrics[i].key === 'ponctualite') {
                            valueDisplay = point.rawValue.toFixed(1) + ' %';
                        } else if (metrics[i].key === 'tempsAttente' || metrics[i].key === 'dureeConsult') {
                            valueDisplay = point.rawValue.toFixed(1) + ' min';
                        }
                        tooltipDiv.html(`
                            <strong>${point.metric}</strong><br/>
                            ${valueDisplay}
                        `)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function() {
                        tooltipDiv.transition().duration(500).style("opacity", 0);
                    });
            });
        }
    });

    // Légende
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 110}, 20)`);

    doctorsToCompare.forEach((doctor, i) => {
        const legendItem = legend.append("g")
            .attr("transform", `translate(0, ${i * 22})`);

        legendItem.append("rect")
            .attr("width", 14)
            .attr("height", 14)
            .attr("rx", 3)
            .attr("fill", doctor.color);

        legendItem.append("text")
            .attr("x", 20)
            .attr("y", 11)
            .attr("font-size", "11px")
            .attr("fill", "#333")
            .text(doctor.name.length > 12 ? doctor.name.substring(0, 12) + "..." : doctor.name);
    });
}

function getRandomColor(seed) {
    const colors = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E'];
    return colors[seed % colors.length];
}
