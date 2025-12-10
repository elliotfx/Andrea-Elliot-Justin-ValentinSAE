// punctualityKPI.js - Displays punctuality statistics

export function initPunctualityKPI() {
    const applyButton = document.getElementById('apply-period');
    if (applyButton) {
        applyButton.addEventListener('click', loadPunctualityData);
    }
}

export async function loadPunctualityData() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const doctorId = document.getElementById('doctor-select').value;

    if (!startDate || !endDate) {
        console.error('Les dates de début et de fin sont requises.');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        console.error('Utilisateur non authentifié');
        window.location.href = 'login.html';
        return;
    }


    try {
        // Build URL with doctor filter if selected
        let url = `/api/punctuality?start-date=${startDate}&end-date=${endDate}`;
        if (doctorId && doctorId !== 'all') {
            url += `&doctor-id=${doctorId}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la récupération des données de ponctualité');
        }

        const data = await response.json();
        updatePunctualityDisplay(data, doctorId);
        drawPunctualityChart(data.punctuality_by_month);
    } catch (error) {
        console.error('Erreur:', error);
    }
}

function updatePunctualityDisplay(data, doctorId) {
    const overallStats = data.overall_stats;

    // Update the main punctuality KPI card
    const punctualityCard = document.getElementById('punctuality-rate');
    if (punctualityCard) {
        punctualityCard.textContent = `${overallStats.punctuality_rate}%`;
        punctualityCard.style.color = overallStats.punctuality_rate >= 80 ? '#50C878' : '#FF6B6B';
    }

    // Update on-time appointments count
    const onTimeCard = document.getElementById('on-time-appointments');
    if (onTimeCard) {
        onTimeCard.textContent = `${overallStats.on_time_appointments} / ${overallStats.total_appointments}`;
    }

    // Update average delay
    const avgDelayCard = document.getElementById('avg-delay');
    if (avgDelayCard) {
        avgDelayCard.textContent = `${overallStats.avg_delay_minutes} min`;
    }

    // Update doctor-specific punctuality if a doctor is selected
    if (doctorId && doctorId !== 'all') {
        const doctorStats = data.punctuality_by_doctor.find(d => d.doctor_id == doctorId);
        if (doctorStats) {
            const doctorPunctualityCard = document.getElementById('doctor-punctuality');
            if (doctorPunctualityCard) {
                doctorPunctualityCard.textContent = `${doctorStats.punctuality_rate}% (${doctorStats.doctor_name})`;
            }
        }
    }
}

function drawPunctualityChart(monthlyData) {
    const svg = d3.select('#punctuality-chart');
    svg.selectAll('*').remove();

    if (!monthlyData || monthlyData.length === 0) {
        svg.append('text')
            .attr('x', 400)
            .attr('y', 200)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('fill', '#666')
            .text('Aucune donnée disponible');
        return;
    }

    const containerWidth = document.querySelector('.chart-container').offsetWidth;
    const margin = { top: 40, right: 60, bottom: 60, left: 60 };
    const width = containerWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    svg.attr('width', containerWidth)
        .attr('height', 400);

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleBand()
        .domain(monthlyData.map(d => d.month))
        .range([0, width])
        .padding(0.3);

    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);

    // Add axes
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');

    g.append('g')
        .call(d3.axisLeft(y).tickFormat(d => d + '%'));

    // Add bars
    g.selectAll('.bar')
        .data(monthlyData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.month))
        .attr('y', d => y(d.punctuality_rate))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.punctuality_rate))
        .attr('fill', d => d.punctuality_rate >= 80 ? '#50C878' : '#FFB347')
        .attr('opacity', 0.8);

    // Add value labels on bars
    g.selectAll('.label')
        .data(monthlyData)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('x', d => x(d.month) + x.bandwidth() / 2)
        .attr('y', d => y(d.punctuality_rate) - 5)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('fill', '#333')
        .text(d => `${d.punctuality_rate}%`);

    // Add reference line at 80%
    g.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', y(80))
        .attr('y2', y(80))
        .attr('stroke', '#50C878')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5')
        .attr('opacity', 0.6);

    g.append('text')
        .attr('x', width)
        .attr('y', y(80) - 5)
        .attr('text-anchor', 'end')
        .style('font-size', '12px')
        .style('fill', '#50C878')
        .text('Objectif 80%');
}
