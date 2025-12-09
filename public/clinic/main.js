// clinic/main.js
import { checkAuth,getLastMonthDateRange,getSelectedDateRange} from "../utilities/utils.js";
import {loadStats} from '../clinic/stats.js';
import {loadMedecinsData} from '../clinic/medecinsPerformance.js';
import {loadVisitsRevenue} from '../clinic/visitsRevenue.js';
import {loadWaitingTimes} from '../clinic/waitingTimes.js';
import {loadActesData}  from '../clinic/actesTable.js';
import {loadChartData} from '../clinic/patientVisits.js';
import {loadHourlyRevenueHeatmap} from '../clinic/hourlyRevenueHeatmap.js';
import {loadPatientsHeatmap} from '../clinic/heatmap.js';
import {loadWaitingTimeHeatmap} from '../clinic/heatmap-waiting-time.js';
import {loadStackedBarData} from '../clinic/rendezvous.js'










// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();

    const { startDate, endDate } = getLastMonthDateRange();

    // Initialiser les champs de date avec les valeurs du mois précédent
    document.getElementById('start-date').value = '2023-01-01';
    document.getElementById('end-date').value = endDate;
    
    // Charger les données pour le mois précédent
    loadStats('2023-01-01', endDate);
    loadMedecinsData('2023-01-01', endDate);
    loadVisitsRevenue('2023-01-01', endDate);
    loadChartData('2023-01-01', endDate);
    loadHourlyRevenueHeatmap('2023-01-01', endDate);
    loadPatientsHeatmap('2023-01-01', endDate);
    loadActesData('2023-01-01', endDate);
    loadWaitingTimes('2023-01-01', endDate);
    loadWaitingTimeHeatmap('2023-01-01', endDate);
    loadStackedBarData('2023-01-01', endDate);

    // Ajouter un écouteur pour le bouton "Appliquer"
    document.getElementById('apply-period').addEventListener('click', function () {
        const { startDate, endDate } = getSelectedDateRange();

        if (startDate && endDate) {
            loadVisitsRevenue(startDate, endDate);
            loadStats(startDate, endDate);
            loadChartData(startDate, endDate);
            loadHourlyRevenueHeatmap(startDate, endDate);
            loadPatientsHeatmap(startDate, endDate);
            loadActesData(startDate, endDate);
            loadMedecinsData(startDate, endDate);
            loadWaitingTimes(startDate, endDate);
            loadWaitingTimeHeatmap(startDate, endDate);
            loadStackedBarData(startDate, endDate);
        } else {
            alert('Veuillez sélectionner les deux dates.');
        }
    });

    // Gestion du menu latéral
    const menuToggle = document.getElementById("menu-toggle");
    const sidebar = document.getElementById("sidebar");
    
    menuToggle.addEventListener("click", function() {
        sidebar.style.width = sidebar.style.width === '250px' ? '0' : '250px';
        document.body.classList.toggle("with-sidebar");
        this.classList.toggle("open"); // Change l'icône de menu
    });
});
