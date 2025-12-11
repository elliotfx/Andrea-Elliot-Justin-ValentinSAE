// dataFetch.js
import { updateStats, updateTable } from './uiUpdate.js';
import { updateTimeAnalysisChart } from './charts.js';
import { loadWaitingTimeHeatmap } from './heatmaps.js';
import { loadVisitsRevenue } from './visitsRevenue.js';
import { updatePatientAnalysisChart } from './patientsChart.js';
import { updateAppointmentsAnalysisChart } from './appointmentsChart.js';
import { updateDoctorWorkTimeAnalysisChart } from './workingTimeChart.js';
import { updatePunctualityDisplay } from './punctualityKPI.js';

export function loadDoctorPerformance(doctorId, startDate, endDate) {
    const token = localStorage.getItem('token');

    if (!token) {
        console.error('Utilisateur non authentifié');
        window.location.href = 'login.html';
        return;
    }

    fetch(`/api/doctor-performance?doctorId=${doctorId}&startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        updateStats(data.stats);
        updateTable(data.actes);
    })
    .catch(error => console.error('Erreur lors de la récupération des performances:', error));
}

export function loadMonthlyStats(doctorId, startDate, endDate) {
    const token = localStorage.getItem('token');

    if (!token) {
        console.error('Utilisateur non authentifié');
        window.location.href = 'login.html';
        return;
    }

    fetch(`/api/doctor/monthly-stats?doctorId=${doctorId}&startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        updatePatientAnalysisChart(data);
        updateAppointmentsAnalysisChart(data);
        updateDoctorWorkTimeAnalysisChart(data);
    })
    .catch(error => console.error('Erreur lors de la récupération des statistiques mensuelles:', error));
}

export function loadTimeData(doctorId, startDate, endDate) {
    const token = localStorage.getItem('token');

    if (!token) {
        console.error('Utilisateur non authentifié');
        window.location.href = 'login.html';
        return;
    }

    fetch(`/api/doctor-time-analysis?doctorId=${doctorId}&startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        updateTimeAnalysisChart(data);
    })
    .catch(error => console.error('Erreur lors de la récupération des données temporelles:', error));
}

export function loadWaitingTimeHeatmapData(doctorId, startDate, endDate) {
    const token = localStorage.getItem('token');

    if (!token) {
        console.error('Utilisateur non authentifié');
        window.location.href = 'login.html';
        return;
    }

    fetch(`/api/waiting-times-heatmap-doctor?doctorId=${doctorId}&start=${startDate}&end=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        loadWaitingTimeHeatmap(data);
    })
    .catch(error => console.error('Erreur lors de la récupération de la heatmap:', error));
}

export function loadVisitRevenueData(doctorId, startDate, endDate) {
    const token = localStorage.getItem('token');

    if (!token) {
        console.error('Utilisateur non authentifié');
        window.location.href = 'login.html';
        return;
    }

    fetch(`/api/visits-revenue?doctorId=${doctorId}&start-date=${startDate}&end-date=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        loadVisitsRevenue(data);
    })
    .catch(error => console.error('Erreur lors de la récupération du revenu des visites:', error));
}

export function loadPunctualityData(doctorId, startDate, endDate) {
    const token = localStorage.getItem('token');
    const period = document.getElementById('punctuality-period-select')?.value || 'month';

    if (!token) {
        console.error('Utilisateur non authentifié');
        window.location.href = 'login.html';
        return;
    }

    let url = `/api/punctuality?start-date=${startDate}&end-date=${endDate}&period=${period}`;
    if (doctorId && doctorId !== 'all') {
        url += `&doctor-id=${doctorId}`;
    }

    fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        updatePunctualityDisplay(data, doctorId);
    })
    .catch(error => console.error('Erreur lors de la récupération de la ponctualité:', error));
}
