// punctualityKPI.js - Displays punctuality statistics

export function initPunctualityKPI() {
    const applyButton = document.getElementById('apply-period');
    if (applyButton) {
        applyButton.addEventListener('click', loadPunctualityData);
    }

    // Add event listener for period selector
    const periodSelector = document.getElementById('punctuality-period-select');
    if (periodSelector) {
        periodSelector.addEventListener('change', () => {
            toggleYearSelector();
            loadPunctualityData();
        });
    }

    // Add event listener for year selector
    const yearSelector = document.getElementById('punctuality-year-select');
    if (yearSelector) {
        yearSelector.addEventListener('change', loadPunctualityData);
    }

    // Initialize year selector visibility
    toggleYearSelector();
}

function toggleYearSelector() {
    const period = document.getElementById('punctuality-period-select')?.value;
    const yearContainer = document.getElementById('punctuality-year-selector-container');

    if (yearContainer) {
        yearContainer.style.display = period === 'month' ? 'block' : 'none';
    }
}

export async function loadPunctualityData() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const doctorId = document.getElementById('doctor-select').value;
    const period = document.getElementById('punctuality-period-select')?.value || 'month';

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
        // Build URL with doctor filter and period if selected
        let url = `/api/punctuality?start-date=${startDate}&end-date=${endDate}&period=${period}`;
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

        // If monthly view, populate year selector and filter data
        if (period === 'month') {
            populateYearSelector(data.punctuality_by_period);
            const selectedYear = document.getElementById('punctuality-year-select')?.value;
            const filteredData = selectedYear
                ? data.punctuality_by_period.filter(d => d.period.startsWith(selectedYear))
                : data.punctuality_by_period;
            drawPunctualityChart(filteredData, period);
        } else {
            drawPunctualityChart(data.punctuality_by_period, period);
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

function populateYearSelector(periodData) {
    if (!periodData || periodData.length === 0) return;

    const yearSelector = document.getElementById('punctuality-year-select');
    if (!yearSelector) return;

    // Extract unique years from period data
    const years = [...new Set(periodData.map(d => d.period.substring(0, 4)))].sort().reverse();

    // Only repopulate if years have changed
    const currentOptions = Array.from(yearSelector.options).map(opt => opt.value);
    if (JSON.stringify(currentOptions) === JSON.stringify(years)) return;

    const currentValue = yearSelector.value;
    yearSelector.innerHTML = '';

    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelector.appendChild(option);
    });

    // Restore previous selection or select most recent year
    if (years.includes(currentValue)) {
        yearSelector.value = currentValue;
    } else if (years.length > 0) {
        yearSelector.value = years[0];
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

function drawPunctualityChart(periodData, period = 'month') {
    const svg = d3.select('#punctuality-chart');
    svg.selectAll('*').remove();

    if (!periodData || periodData.length === 0) {
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
        .domain(periodData.map(d => d.period))
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
        .attr('transform', period === 'year' ? 'rotate(0)' : 'rotate(-45)')
        .style('text-anchor', period === 'year' ? 'middle' : 'end');

    g.append('g')
        .call(d3.axisLeft(y).tickFormat(d => d + '%'));

    // Add bars
    g.selectAll('.bar')
        .data(periodData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.period))
        .attr('y', d => y(d.punctuality_rate))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.punctuality_rate))
        .attr('fill', d => d.punctuality_rate >= 80 ? '#50C878' : '#FFB347')
        .attr('opacity', 0.8);

    // Add value labels on bars
    g.selectAll('.label')
        .data(periodData)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('x', d => x(d.period) + x.bandwidth() / 2)
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
