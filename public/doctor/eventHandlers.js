// eventHandlers.js
import { loadDoctorPerformance, loadTimeData, loadWaitingTimeHeatmapData, loadVisitRevenueData, loadMonthlyStats, loadPunctualityData } from './dataFetch.js';
import { updateYearlyVisitsChart } from './yearlyVisitsChart.js';
import { loadBenchmarkChart } from './benchmarkRadarChart.js';

// Function to load all dashboard data
export function loadDashboardData() {
    const doctorId = document.getElementById('doctor-select').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    // Charger toutes les données immédiatement sans attendre (pattern clinic)
    loadDoctorPerformance(doctorId, startDate, endDate);
    loadTimeData(doctorId, startDate, endDate);
    loadWaitingTimeHeatmapData(doctorId, startDate, endDate);
    loadVisitRevenueData(doctorId, startDate, endDate);
    loadMonthlyStats(doctorId, startDate, endDate);
    loadPunctualityData(doctorId, startDate, endDate);
    updateYearlyVisitsChart(doctorId);
    
    // Nouveau graphique benchmark
    loadBenchmarkChart();
}

export function setupEventListeners() {
    document.getElementById('apply-period').addEventListener('click', function() {
        loadDashboardData();
    });
}