import { checkAuth } from "../utilities/utils.js";
    // Fonction pour charger les données des actes avec un intervalle de dates
export function loadActesData(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
        fetch(`/api/actes?start=${startDate}&end=${endDate}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, // Ajouter le token JWT dans l'en-tête Authorization
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                // Gérer les erreurs de réponse
                throw new Error('Échec de la récupération des données');
            }
            return response.json();
        })
        .then(data => {
            const tableBody = document.querySelector('#actes-table tbody');
            tableBody.innerHTML = ''; // Effacer les données précédentes

            // Variables pour stocker les totaux
            let totalPatients = 0;
            let totalVisits = 0;
            let totalCA = 0;
            let totalHours = 0;

            // Parcourir les données et remplir le tableau
            data.forEach(d => {
                totalPatients += d.uniq_patients;
                totalVisits += d.total_visits;
                totalCA += d.CA;
                totalHours += d.total_hours;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${d.acte}</td>
                    <td class="text-right">${d.uniq_patients}</td>
                    <td class="text-right">${d.total_visits}</td>
                    <td class="text-right">${d.CA} €</td>
                    <td class="text-right">${d.total_hours} heures</td>
                    <td class="text-right highlight">${d.avg_cost_per_hour.toFixed(2)} €</td>
                `;
                tableBody.appendChild(row);
            });

            // Ajouter une ligne pour afficher les totaux
            const totalRow = document.createElement('tr');
            totalRow.innerHTML = `
                <td><strong>Total</strong></td>
                <td class="text-right"><strong>${totalPatients}</strong></td>
                <td class="text-right"><strong>${totalVisits}</strong></td>
                <td class="text-right"><strong>${totalCA.toFixed(2)} €</strong></td>
                <td class="text-right"><strong>${totalHours.toFixed(2)} heures</strong></td>
                <td></td> <!-- Pas de moyenne du coût par heure pour la ligne totale -->
            `;
            tableBody.appendChild(totalRow);
            console.log("Ligne des totaux ajoutée:", totalRow);
        })
        .catch(error => console.error('Erreur lors de la récupération des données:', error));
    }