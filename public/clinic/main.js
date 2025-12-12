// clinic/main.js
import { checkAuth, getLastMonthDateRange, getSelectedDateRange, getDataDateRange } from "../utilities/utils.js";
import { loadStats } from '../clinic/stats.js';
import { loadMedecinsData } from '../clinic/medecinsPerformance.js';
import { loadVisitsRevenue } from '../clinic/visitsRevenue.js';
import { loadWaitingTimes } from '../clinic/waitingTimes.js';
import { loadActesData } from '../clinic/actesTable.js';
import { loadChartData } from '../clinic/patientVisits.js';
import { loadHourlyRevenueHeatmap } from '../clinic/hourlyRevenueHeatmap.js';
import { loadPatientsHeatmap } from '../clinic/heatmap.js';
import { loadWaitingTimeHeatmap } from '../clinic/heatmap-waiting-time.js';
import { loadStackedBarData } from '../clinic/rendezvous.js'
import { createCustomFiltersUI } from '../utilities/customDateFilters.js';

/**
 * Charge toutes les données avec les dates spécifiées
 * @param {string} startDate - Date de début
 * @param {string} endDate - Date de fin
 */
function loadAllData(startDate, endDate) {
    loadStats(startDate, endDate);
    loadMedecinsData(startDate, endDate);
    loadVisitsRevenue(startDate, endDate);
    loadChartData(startDate, endDate);
    loadHourlyRevenueHeatmap(startDate, endDate);
    loadPatientsHeatmap(startDate, endDate);
    loadActesData(startDate, endDate);
    loadWaitingTimes(startDate, endDate);
    loadWaitingTimeHeatmap(startDate, endDate);
    loadStackedBarData(startDate, endDate);
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', async function () {
    checkAuth();

    const { startDate, endDate } = await getDataDateRange();

    // Initialiser les champs de date avec les valeurs personnalisées
    document.getElementById('start-date').value = '2023-01-01';
    document.getElementById('end-date').value = endDate;

    // Initialiser le composant de filtres personnalisés
    const customFiltersContainer = document.getElementById('custom-filters-container');
    if (customFiltersContainer) {
        createCustomFiltersUI(customFiltersContainer, (filterStartDate, filterEndDate) => {
            // Callback appelée quand un filtre personnalisé est appliqué
            loadAllData(filterStartDate, filterEndDate);
        });
    }

    // Charger les données à partir du 01/01/2023
    loadAllData('2023-01-01', endDate);

    // Ajouter un écouteur pour le bouton "Appliquer"
    document.getElementById('apply-period').addEventListener('click', function () {
        const { startDate, endDate } = getSelectedDateRange();

        if (startDate && endDate) {
            loadAllData(startDate, endDate);
        } else {
            alert('Veuillez sélectionner les deux dates.');
        }
    });
});
