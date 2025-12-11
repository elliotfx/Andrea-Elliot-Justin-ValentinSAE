// Graphique de fidélité des patients - Vue Année et Mois avec KPI

let currentPeriodView = 'year';
let currentStatsData = null;
let selectedYear = null;

export function updatePatientAnalysisChart(stats) {
    currentStatsData = stats;

    // Setup period selector event listener
    const periodSelect = document.getElementById('patients-period-select');
    if (periodSelect && !periodSelect.dataset.listenerAdded) {
        periodSelect.addEventListener('change', (e) => {
            currentPeriodView = e.target.value;
            toggleYearSelector();
            renderChart();
        });
        periodSelect.dataset.listenerAdded = 'true';
    }

    // Setup year selector
    setupYearSelector();

    renderChart();
}

function toggleYearSelector() {
    const yearContainer = document.getElementById('year-selector-container');
    const kpiSection = document.getElementById('patients-kpi-section');

    if (currentPeriodView === 'month') {
        yearContainer.style.display = 'block';
        kpiSection.style.display = 'block';
    } else {
        yearContainer.style.display = 'none';
        kpiSection.style.display = 'none';
    }
}

function setupYearSelector() {
    if (!currentStatsData) return;

    const years = [...new Set(Object.keys(currentStatsData).map(k => k.split('-')[0]))].sort().reverse();
    selectedYear = selectedYear || years[0];

    const yearSelect = document.getElementById('patients-year-select');
    if (yearSelect && !yearSelect.dataset.listenerAdded) {
        yearSelect.innerHTML = years.map(y => `<option value="${y}" ${y === selectedYear ? 'selected' : ''}>${y}</option>`).join('');

        yearSelect.addEventListener('change', (e) => {
            selectedYear = e.target.value;
            renderChart();
        });
        yearSelect.dataset.listenerAdded = 'true';
    }
}

function renderChart() {
    if (!currentStatsData) return;

    if (currentPeriodView === 'year') {
        renderYearlyChart(currentStatsData);
    } else {
        calculateKPIs(currentStatsData);
        renderMonthlyChart(currentStatsData, selectedYear);
    }
}

function calculateKPIs(stats) {
    const dataByYear = {};

    Object.keys(stats).forEach(month => {
        const year = month.split('-')[0];
        const s = stats[month].stats;

        if (!dataByYear[year]) {
            dataByYear[year] = { nouveaux: 0, fideles: 0, pasRetour: 0 };
        }

        dataByYear[year].nouveaux += (s.newPatients || 0);
        dataByYear[year].fideles += (s.loyalPatients || 0);
        dataByYear[year].pasRetour += (s.patientsPasRetour || 0);
    });

    const years = Object.keys(dataByYear).sort();
    const currentYearIndex = years.indexOf(selectedYear);

    if (currentYearIndex > 0) {
        const currentYearData = dataByYear[selectedYear];
        const previousYearData = dataByYear[years[currentYearIndex - 1]];

        updateKPI('nouveaux', currentYearData.nouveaux, previousYearData.nouveaux);
        updateKPI('fideles', currentYearData.fideles, previousYearData.fideles);
        updateKPI('pasretour', currentYearData.pasRetour, previousYearData.pasRetour);
    } else {
        document.getElementById('kpi-nouveaux').textContent = dataByYear[selectedYear]?.nouveaux || 0;
        document.getElementById('kpi-nouveaux-change').innerHTML = '<span style="color: #999">Pas de données N-1</span>';
        document.getElementById('kpi-fideles').textContent = dataByYear[selectedYear]?.fideles || 0;
        document.getElementById('kpi-fideles-change').innerHTML = '<span style="color: #999">Pas de données N-1</span>';
        document.getElementById('kpi-pasretour').textContent = dataByYear[selectedYear]?.pasRetour || 0;
        document.getElementById('kpi-pasretour-change').innerHTML = '<span style="color: #999">Pas de données N-1</span>';
    }
}

function updateKPI(type, currentValue, previousValue) {
    const diff = currentValue - previousValue;
    const percentChange = previousValue > 0 ? ((diff / previousValue) * 100).toFixed(1) : 0;
    const arrow = diff > 0 ? '↗' : diff < 0 ? '↘' : '→';
    const color = diff > 0 ? '#28a745' : diff < 0 ? '#dc3545' : '#6c757d';

    document.getElementById(`kpi-${type}`).textContent = currentValue;
    document.getElementById(`kpi-${type}-change`).innerHTML = `
        <span style="color: ${color}; font-weight: bold;">
            ${arrow} ${diff > 0 ? '+' : ''}${diff} (${percentChange > 0 ? '+' : ''}${percentChange}%)
        </span>
    `;
}

function renderYearlyChart(stats) {
    // Supprimer les anciens éléments du graphique
    d3.select("#patients-chart").selectAll("*").remove();

    const margin = { top: 40, right: 150, bottom: 60, left: 70 };
    const width = 1200 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#patients-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Regrouper les données par année
    const dataByYear = {};
    Object.keys(stats).forEach(month => {
        const year = month.split('-')[0];
        const s = stats[month].stats;

        if (!dataByYear[year]) {
            dataByYear[year] = { nouveaux: 0, fideles: 0, pasRetour: 0 };
        }

        dataByYear[year].nouveaux += (s.newPatients || 0);
        dataByYear[year].fideles += (s.loyalPatients || 0);
        dataByYear[year].pasRetour += (s.patientsPasRetour || 0);
    });

    const years = Object.keys(dataByYear).sort();
    const data = years.map(year => ({
        year: year,
        nouveaux: dataByYear[year].nouveaux,
        fideles: dataByYear[year].fideles,
        pasRetour: dataByYear[year].pasRetour,
        total: dataByYear[year].nouveaux + dataByYear[year].fideles
    }));

    const x = d3.scaleBand().domain(data.map(d => d.year)).range([0, width]).padding(0.3);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => Math.max(d.nouveaux, d.fideles, d.pasRetour)) * 1.1]).nice().range([height, 0]);

    const colors = { nouveaux: '#4A90E2', fideles: '#50C878', pasRetour: '#FF6B6B' };
    const subgroups = ['nouveaux', 'fideles', 'pasRetour'];
    const xSubgroup = d3.scaleBand().domain(subgroups).range([0, x.bandwidth()]).padding(0.08);

    svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x)).selectAll("text").style("font-size", "14px").style("font-weight", "bold");
    svg.append('g').call(d3.axisLeft(y));
    svg.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -50).attr('text-anchor', 'middle').style('font-size', '14px').style('font-weight', 'bold').text('Nombre de Patients');
    svg.append('text').attr('x', width / 2).attr('y', -15).attr('text-anchor', 'middle').style('font-size', '18px').style('font-weight', 'bold').text('Fidélité des Patients par Année');

    const tooltip = createTooltip('tooltip-patients-yearly');

    const yearGroups = svg.selectAll(".year-group").data(data).enter().append("g").attr("class", "year-group").attr("transform", d => `translate(${x(d.year)},0)`);

    subgroups.forEach(subgroup => {
        yearGroups.append("rect")
            .attr("x", xSubgroup(subgroup))
            .attr("y", d => y(d[subgroup]))
            .attr("width", xSubgroup.bandwidth())
            .attr("height", d => height - y(d[subgroup]))
            .attr("fill", colors[subgroup])
            .style("opacity", 0.85)
            .on("mouseover", function (event, d) {
                d3.select(this).style("opacity", 1);
                showTooltip(tooltip, event, d, subgroup, 'year', d.total);
            })
            .on("mouseout", function () {
                d3.select(this).style("opacity", 0.85);
                hideTooltip(tooltip);
            });

        yearGroups.filter(d => d[subgroup] > 0).append("text")
            .attr("x", xSubgroup(subgroup) + xSubgroup.bandwidth() / 2)
            .attr("y", d => y(d[subgroup]) - 5)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .style("fill", colors[subgroup])
            .text(d => d[subgroup]);
    });

    addLegend(svg, width, colors);
}

function renderMonthlyChart(stats, year) {
    // Supprimer les anciens éléments
    d3.select("#patients-chart").selectAll("*").remove();

    const margin = { top: 40, right: 150, bottom: 60, left: 70 };
    const width = 1200 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#patients-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Filtrer les données pour l'année sélectionnée
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const data = [];

    for (let m = 1; m <= 12; m++) {
        const monthKey = `${year}-${String(m).padStart(2, '0')}`;
        const monthData = stats[monthKey];

        if (monthData) {
            const s = monthData.stats;
            data.push({
                month: monthNames[m - 1],
                nouveaux: s.newPatients || 0,
                fideles: s.loyalPatients || 0,
                pasRetour: s.patientsPasRetour || 0,
                total: (s.newPatients || 0) + (s.loyalPatients || 0)
            });
        } else {
            data.push({
                month: monthNames[m - 1],
                nouveaux: 0,
                fideles: 0,
                pasRetour: 0,
                total: 0
            });
        }
    }

    const x = d3.scaleBand().domain(data.map(d => d.month)).range([0, width]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => Math.max(d.nouveaux, d.fideles, d.pasRetour)) * 1.1]).nice().range([height, 0]);

    const colors = { nouveaux: '#4A90E2', fideles: '#50C878', pasRetour: '#FF6B6B' };
    const subgroups = ['nouveaux', 'fideles', 'pasRetour'];
    const xSubgroup = d3.scaleBand().domain(subgroups).range([0, x.bandwidth()]).padding(0.08);

    svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x));
    svg.append('g').call(d3.axisLeft(y));
    svg.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -50).attr('text-anchor', 'middle').style('font-size', '14px').style('font-weight', 'bold').text('Nombre de Patients');
    svg.append('text').attr('x', width / 2).attr('y', -15).attr('text-anchor', 'middle').style('font-size', '18px').style('font-weight', 'bold').text(`Fidélité des Patients par Mois - ${year}`);

    const tooltip = createTooltip('tooltip-patients-monthly');

    const monthGroups = svg.selectAll(".month-group").data(data).enter().append("g").attr("class", "month-group").attr("transform", d => `translate(${x(d.month)},0)`);

    subgroups.forEach(subgroup => {
        monthGroups.append("rect")
            .attr("x", xSubgroup(subgroup))
            .attr("y", d => y(d[subgroup]))
            .attr("width", xSubgroup.bandwidth())
            .attr("height", d => height - y(d[subgroup]))
            .attr("fill", colors[subgroup])
            .style("opacity", 0.85)
            .on("mouseover", function (event, d) {
                d3.select(this).style("opacity", 1);
                showTooltip(tooltip, event, d, subgroup, 'month', d.total);
            })
            .on("mouseout", function () {
                d3.select(this).style("opacity", 0.85);
                hideTooltip(tooltip);
            });

        monthGroups.filter(d => d[subgroup] > 0).append("text")
            .attr("x", xSubgroup(subgroup) + xSubgroup.bandwidth() / 2)
            .attr("y", d => y(d[subgroup]) - 5)
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .style("fill", colors[subgroup])
            .text(d => d[subgroup]);
    });

    addLegend(svg, width, colors);
}

function createTooltip(className) {
    return d3.select('body').append('div')
        .attr('class', className)
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background-color', 'rgba(0, 0, 0, 0.85)')
        .style('color', '#fff')
        .style('padding', '12px')
        .style('border-radius', '6px')
        .style('font-size', '13px')
        .style('pointer-events', 'none')
        .style('box-shadow', '0 4px 6px rgba(0,0,0,0.3)');
}

function showTooltip(tooltip, event, d, subgroup, periodType, total) {
    const labels = {
        nouveaux: 'Nouveaux Patients',
        fideles: 'Patients Fidèles',
        pasRetour: 'Patients Sans Retour'
    };

    const percentage = total > 0 ? ((d[subgroup] / total) * 100).toFixed(1) : '0.0';
    const period = periodType === 'year' ? d.year : d.month;

    tooltip.transition().duration(200).style('opacity', 1);
    tooltip.html(`
        <strong>${periodType === 'year' ? 'Année' : 'Mois'} :</strong> ${period}<br>
        <strong>${labels[subgroup]} :</strong> ${d[subgroup]}<br>
        <strong>Pourcentage :</strong> ${percentage}%<br>
        <strong>Total Patients :</strong> ${total}
    `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
}

function hideTooltip(tooltip) {
    tooltip.transition().duration(500).style('opacity', 0);
}

function addLegend(svg, width, colors) {
    const legend = svg.append('g').attr('transform', `translate(${width + 30}, 50)`);

    const legendData = [
        { label: 'Nouveaux Patients', color: colors.nouveaux, description: 'Première visite' },
        { label: 'Patients Fidèles', color: colors.fideles, description: 'Déjà consultés' },
        { label: 'Patients Sans Retour', color: colors.pasRetour, description: 'Pas reconsulté' }
    ];

    legendData.forEach((item, i) => {
        const row = legend.append('g').attr('transform', `translate(0, ${i * 65})`);
        row.append('rect').attr('width', 24).attr('height', 24).attr('rx', 4).style('fill', item.color).style('opacity', 0.85);
        row.append('text').attr('x', 32).attr('y', 12).attr('dy', '0.35em').style('font-size', '14px').style('font-weight', 'bold').text(item.label);
        row.append('text').attr('x', 32).attr('y', 32).style('font-size', '11px').style('fill', '#666').text(item.description);
    });
}
