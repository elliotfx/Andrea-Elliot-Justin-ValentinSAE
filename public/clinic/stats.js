// stats.js
import { checkAuth } from "../utilities/utils.js";

// Fonction pour charger les statistiques avec des dates
export function loadStats(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
    fetch(`/api/stats?startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, // Ajouter le token JWT dans l'en-tête Authorization
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Erreur HTTP ! statut : ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Données reçues :', data);
        // Mettre à jour les cartes avec les données récupérées
        d3.select('#total-visits').text(data.total_visits);
        d3.select('#new-patients').text(data.new_patients);
        d3.select('#loyal-patients').text(data.loyal_patients);
        d3.select('#new-patients-continued').text(data.new_patients_continued);
        d3.select('#avg-waiting-time').text(data.avg_waiting_time + ' min');
        d3.select('#total_rendez_vous').text(data.taked_visits);
        d3.select('#total_patients').text(data.total_patients);
        d3.select('#CA_Per_hour').text(data.CA_Per_hour + ' €');
        d3.select('#CA').text(data.CA + ' €');
    })
    .catch(error => console.error('Erreur lors de la récupération des données :', error));
}
