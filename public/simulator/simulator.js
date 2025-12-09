import { checkAuth } from "../utilities/utils.js";

// Fonction pour charger la liste des actes
export function loadActesList() {
    checkAuth();
    const token = localStorage.getItem('token');
    
    // Utiliser une période large pour récupérer tous les actes
    const startDate = '2020-01-01';
    const endDate = '2025-12-31';
    
    return fetch(`/api/actes?start=${startDate}&end=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Échec de la récupération des actes');
        }
        return response.json();
    })
    .then(data => {
        console.log('Actes récupérés:', data);
        return data;
    })
    .catch(error => {
        console.error('Erreur lors de la récupération des actes:', error);
        return [];
    });
}

// Fonction pour charger la liste des médecins
export function loadDoctorsList() {
    checkAuth();
    const token = localStorage.getItem('token');
    
    return fetch('/api/doctors', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Échec de la récupération des médecins');
        }
        return response.json();
    })
    .then(data => {
        console.log('Médecins récupérés:', data);
        return data;
    })
    .catch(error => {
        console.error('Erreur lors de la récupération des médecins:', error);
        return [];
    });
}

// Fonction pour charger les médecins avec leurs spécialités et statistiques
export function loadDoctorsWithSpecialty(startDate, endDate) {
    checkAuth();
    const token = localStorage.getItem('token');
    
    return fetch(`/api/medecins?startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Échec de la récupération des médecins avec spécialités');
        }
        return response.json();
    })
    .then(data => {
        console.log('Médecins avec spécialités récupérés:', data);
        return data;
    })
    .catch(error => {
        console.error('Erreur lors de la récupération des médecins avec spécialités:', error);
        return [];
    });
}

// Fonction pour peupler le dropdown des actes
export function populateActesDropdown(selectId = 'acte-select') {
    loadActesList().then(actes => {
        const select = document.getElementById(selectId);
        if (!select) {
            console.error(`Element with id '${selectId}' not found`);
            return;
        }
        
        select.innerHTML = '<option value="">-- Sélectionner un acte --</option>';
        
        actes.forEach(acte => {
            const option = document.createElement('option');
            option.value = acte.acte;
            option.textContent = acte.acte;
            option.dataset.ca = acte.CA || 0;
            option.dataset.visits = acte.total_visits || 0;
            select.appendChild(option);
        });
    });
}

// Fonction pour peupler le dropdown des médecins
export function populateDoctorsDropdown(selectId = 'doctor-select') {
    loadDoctorsList().then(doctors => {
        const select = document.getElementById(selectId);
        if (!select) {
            console.error(`Element with id '${selectId}' not found`);
            return;
        }
        
        select.innerHTML = '<option value="">-- Sélectionner un médecin --</option>';
        
        doctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor.id;
            option.textContent = `${doctor.firstName} ${doctor.lastName}`;
            select.appendChild(option);
        });
    });
}

// Fonction pour afficher tous les actes dans un tableau
export function displayActesTable(tableId = 'actes-list') {
    loadActesList().then(actes => {
        const tableBody = document.querySelector(`#${tableId} tbody`);
        if (!tableBody) {
            console.error(`Table body for '${tableId}' not found`);
            return;
        }
        
        tableBody.innerHTML = '';
        
        actes.forEach(acte => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${acte.acte}</td>
                <td class="text-right">${acte.uniq_patients || 0}</td>
                <td class="text-right">${acte.total_visits || 0}</td>
                <td class="text-right">${(acte.CA || 0).toFixed(2)} €</td>
                <td class="text-right">${(acte.total_hours || 0).toFixed(2)} h</td>
                <td class="text-right">${(acte.avg_cost_per_hour || 0).toFixed(2)} €/h</td>
            `;
            tableBody.appendChild(row);
        });
    });
}

// Fonction pour afficher tous les médecins dans un tableau
export function displayDoctorsTable(tableId = 'doctors-list', startDate, endDate) {
    loadDoctorsWithSpecialty(startDate, endDate).then(doctors => {
        const tableBody = document.querySelector(`#${tableId} tbody`);
        if (!tableBody) {
            console.error(`Table body for '${tableId}' not found`);
            return;
        }
        
        tableBody.innerHTML = '';
        
        doctors.forEach(doctor => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${doctor.firstName || ''} ${doctor.lastName || ''}</td>
                <td>${doctor.speciality || 'N/A'}</td>
                <td class="text-right">${doctor.total_hours_worked || 0} h</td>
                <td class="text-right">${(doctor.total_amount || 0).toFixed(2)} €</td>
                <td class="text-right">${doctor.total_consultations || 0}</td>
                <td class="text-right">${(doctor.revenue_per_hour || 0).toFixed(2)} €/h</td>
            `;
            tableBody.appendChild(row);
        });
    });
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    console.log('Simulator.js chargé');
});

// Fonction pour gérer la validation de la sélection
export function handleValidateSelection() {
    const validateBtn = document.getElementById('validate-selection');
    const acteSelect = document.getElementById('acte-select');
    const doctorSelect = document.getElementById('doctor-select');
    const percentageSection = document.getElementById('percentage-section');
    
    if (!validateBtn || !acteSelect || !doctorSelect || !percentageSection) {
        console.error('Éléments manquants dans le DOM');
        return;
    }
    
    validateBtn.addEventListener('click', () => {
        const selectedActe = acteSelect.value;
        const selectedDoctor = doctorSelect.value;
        
        if (!selectedActe || !selectedDoctor) {
            alert('Veuillez sélectionner un acte et un médecin');
            return;
        }
        
        // Afficher la section des pourcentages
        percentageSection.style.display = 'block';
        
        // Smooth scroll vers la section
        percentageSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        console.log('Acte sélectionné:', selectedActe);
        console.log('Médecin sélectionné:', selectedDoctor);
    });
}

// Fonction pour calculer la rentabilité
export function calculateProfitability(actePrice, doctorPercentage, centerPercentage) {
    const doctorCost = (actePrice * doctorPercentage) / 100;
    const centerCost = (actePrice * centerPercentage) / 100;
    const profit = actePrice - doctorCost - centerCost;
    const profitMargin = (profit / actePrice) * 100;
    
    return {
        doctorCost: doctorCost.toFixed(2),
        centerCost: centerCost.toFixed(2),
        profit: profit.toFixed(2),
        profitMargin: profitMargin.toFixed(2)
    };
}

// Fonction pour gérer le changement des pourcentages
export function handlePercentageChange() {
    const doctorPercentageInput = document.getElementById('doctor-percentage');
    const centerPercentageInput = document.getElementById('center-percentage');
    
    if (!doctorPercentageInput || !centerPercentageInput) {
        console.error('Champs de pourcentage manquants');
        return;
    }
    
    const updateCalculation = () => {
        const doctorPercentage = parseFloat(doctorPercentageInput.value) || 0;
        const centerPercentage = parseFloat(centerPercentageInput.value) || 0;
        
        console.log('Pourcentage médecin:', doctorPercentage);
        console.log('Pourcentage centre:', centerPercentage);
        
        // Vérifier que le total ne dépasse pas 100%
        if (doctorPercentage + centerPercentage > 100) {
            alert('Attention : Le total des pourcentages dépasse 100% !');
        }
    };
    
    doctorPercentageInput.addEventListener('input', updateCalculation);
    centerPercentageInput.addEventListener('input', updateCalculation);
}
