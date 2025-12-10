// main.js

import { setupEventListeners, loadDashboardData } from './eventHandlers.js';
import { checkAuth, getDataDateRange } from '../utilities/utils.js'

// Function to populate the doctor dropdown
async function populateDoctorDropdown() {
    const token = localStorage.getItem('token'); // Get JWT token from localStorage

    if (!token) {
        console.error('Utilisateur non authentifié');
        window.location.href = 'login.html'; // Redirect to login page if no token
        return;
    }

    // API call to get the list of doctors
    return fetch('/api/doctors', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, // Add JWT token to Authorization header
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.json())
        .then(doctors => {
            const select = document.getElementById('doctor-select');
            doctors.forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor.id;
                option.textContent = `${doctor.firstName} ${doctor.lastName}`;
                select.appendChild(option);
            });
            console.log('Médecins chargés:', doctors.length);
        })
        .catch(error => console.error('Erreur lors de la récupération des médecins:', error));
}

document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    const { startDate, endDate } = await getDataDateRange();

    console.log('Dates récupérées:', { startDate, endDate });

    // Initialiser les champs de date avec les valeurs réelles
    document.getElementById('start-date').value = startDate;
    document.getElementById('end-date').value = endDate;

    console.log('Valeurs assignées:', {
        start: document.getElementById('start-date').value,
        end: document.getElementById('end-date').value
    });

    // Wait for doctors to be loaded before loading dashboard data
    await populateDoctorDropdown(); // Wait for doctor dropdown to populate
    setupEventListeners(); // Setup the other event listeners

    // Load dashboard data automatically on page load AFTER doctors are loaded
    console.log('Chargement automatique des données...');
    await loadDashboardData();
});
