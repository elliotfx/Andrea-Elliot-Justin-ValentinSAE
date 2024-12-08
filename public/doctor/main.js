// main.js

import { setupEventListeners } from './eventHandlers.js';
import {checkAuth,getLastMonthDateRange} from '../utilities/utils.js'

// Function to populate the doctor dropdown
function populateDoctorDropdown() {
    const token = localStorage.getItem('token'); // Get JWT token from localStorage

    if (!token) {
        console.error('Utilisateur non authentifié');
        window.location.href = 'login.html'; // Redirect to login page if no token
        return;
    }

    // API call to get the list of doctors
    fetch('/api/doctors', {
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
    })
    .catch(error => console.error('Erreur lors de la récupération des médecins:', error));
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    const { startDate, endDate } = getLastMonthDateRange();

    // Initialiser les champs de date avec les valeurs du mois précédent
    document.getElementById('start-date').value = startDate;
    document.getElementById('end-date').value = endDate;
    populateDoctorDropdown(); // Call the function to populate the doctor dropdown
    setupEventListeners(); // Setup the other event listeners
});
