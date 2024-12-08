// eventHandlers.js
import { fetchDoctorPerformance, fetchTimeData, fetchWaitingTimeHeatmapData, fetchVisitRevenueData,fetchMonthlyStats} from './dataFetch.js';
import { updateStats, updateTable } from './uiUpdate.js'; // Ajout de la nouvelle fonction updatePatientAnalysisChart
import { updateTimeAnalysisChart } from './charts.js';
import { loadWaitingTimeHeatmap } from './heatmaps.js';
import { loadVisitsRevenue } from './visitsRevenue.js';
import {updatePatientAnalysisChart} from './patientsChart.js';
import {updateAppointmentsAnalysisChart} from './appointmentsChart.js'
import {updateDoctorWorkTimeAnalysisChart} from './workingTimeChart.js'

export function setupEventListeners() {
    document.getElementById('apply-period').addEventListener('click', async () => {
        const doctorId = document.getElementById('doctor-select').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;

        const performanceData = await fetchDoctorPerformance(doctorId, startDate, endDate);
        updateStats(performanceData.stats);
        updateTable(performanceData.actes);
        
        const timeData = await fetchTimeData(doctorId, startDate, endDate);
        updateTimeAnalysisChart(timeData);

        const heatmapData = await fetchWaitingTimeHeatmapData(doctorId, startDate, endDate);
        loadWaitingTimeHeatmap(heatmapData);
        
        const visitRevenueData = await fetchVisitRevenueData(doctorId, startDate, endDate);
        loadVisitsRevenue(visitRevenueData);
        
        // Nouvelle partie pour la mise à jour du graphique d'analyse des patients
        const monthlyStats= await fetchMonthlyStats(doctorId, startDate, endDate);
        updatePatientAnalysisChart(monthlyStats); 
        updateAppointmentsAnalysisChart(monthlyStats);
        updateDoctorWorkTimeAnalysisChart(monthlyStats);
    });
}
