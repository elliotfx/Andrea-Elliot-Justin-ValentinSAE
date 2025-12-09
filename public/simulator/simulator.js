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
        
        // Charger le prix moyen
        loadAveragePrice(selectedActe, selectedDoctor);
        
        // Smooth scroll vers la section
        percentageSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        console.log('Acte sélectionné:', selectedActe);
        console.log('Médecin sélectionné:', selectedDoctor);
    });
}

// Fonction pour charger le prix moyen d'un acte pour un médecin
function loadAveragePrice(acte, doctorId) {
    checkAuth();
    const token = localStorage.getItem('token');
    
    // Utiliser une période large pour calculer la moyenne
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(new Date().setFullYear(new Date().getFullYear() - 2))
        .toISOString().split('T')[0];
    
    const avgPriceInfo = document.getElementById('average-price-info');
    const avgPriceText = document.getElementById('average-price-text');
    const actePriceInput = document.getElementById('acte-price');
    
    if (!avgPriceInfo || !avgPriceText) return;
    
    // Afficher un message de chargement
    avgPriceInfo.style.display = 'block';
    avgPriceText.textContent = 'Calcul du prix moyen...';
    
    // Appel API pour récupérer les données de l'acte
    fetch(`/api/actes?start=${startDate}&end=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Échec de la récupération des données');
        }
        return response.json();
    })
    .then(data => {
        // Trouver l'acte sélectionné
        const acteData = data.find(a => a.acte === acte);
        
        if (acteData && acteData.total_visits > 0) {
            const avgPrice = acteData.CA / acteData.total_visits;
            
            avgPriceText.innerHTML = `Le prix moyen de <strong>${acte}</strong> est de <strong>${avgPrice.toFixed(2)}€</strong> (basé sur ${acteData.total_visits} visites)`;
            
            // Pré-remplir le champ avec le prix moyen
            if (actePriceInput) {
                actePriceInput.value = avgPrice.toFixed(2);
                actePriceInput.style.backgroundColor = '#e8f5e9';
            }
        } else {
            avgPriceText.innerHTML = `Aucune donnée disponible pour <strong>${acte}</strong>. Veuillez saisir un prix manuellement.`;
            avgPriceInfo.style.backgroundColor = '#fff3e0';
        }
    })
    .catch(error => {
        console.error('Erreur lors du chargement du prix moyen:', error);
        avgPriceText.textContent = 'Impossible de charger le prix moyen. Veuillez saisir un prix manuellement.';
        avgPriceInfo.style.backgroundColor = '#ffebee';
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

// Fonction pour gérer le calcul de rentabilité
export function handleCalculateProfitability() {
    const calculateBtn = document.getElementById('calculate-btn');
    const actePriceInput = document.getElementById('acte-price');
    const chartSection = document.getElementById('chart-section');
    
    if (!calculateBtn || !actePriceInput || !chartSection) {
        console.error('Éléments manquants pour le calcul');
        return;
    }
    
    calculateBtn.addEventListener('click', () => {
        const actePrice = parseFloat(actePriceInput.value);
        
        // Validation
        if (!actePrice || actePrice <= 0) {
            alert('Veuillez saisir un prix valide pour l\'acte');
            return;
        }
        
        // Générer et afficher le tableau
        generateProfitabilityTable(actePrice);
        
        // Afficher la section
        chartSection.style.display = 'block';
        chartSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
}

// Fonction pour générer le tableau de rentabilité
function generateProfitabilityTable(actePrice) {
    const tbody = document.getElementById('profitability-tbody');
    const table = document.getElementById('profitability-table');
    const thead = table.querySelector('thead tr');
    const tooltip = document.getElementById('cell-tooltip');
    
    if (!tbody || !thead) {
        console.error('Tableau non trouvé');
        return;
    }
    
    // Définir les pourcentages
    let doctorPercentages = [20, 25, 30, 35, 40, 45, 50, 55, 60];
    let centerPercentages = [10, 15, 20, 25, 30, 35, 40, 45, 50];
    
    // Ajouter les pourcentages personnalisés s'ils existent
    const customDoctorPct = document.getElementById('custom-doctor-pct');
    const customCenterPct = document.getElementById('custom-center-pct');
    
    if (customDoctorPct && customDoctorPct.value && !isNaN(customDoctorPct.value)) {
        const customDocValue = parseInt(customDoctorPct.value);
        if (customDocValue >= 0 && customDocValue <= 100 && !doctorPercentages.includes(customDocValue)) {
            doctorPercentages.push(customDocValue);
            doctorPercentages.sort((a, b) => a - b);
        }
    }
    
    if (customCenterPct && customCenterPct.value && !isNaN(customCenterPct.value)) {
        const customCenValue = parseInt(customCenterPct.value);
        if (customCenValue >= 0 && customCenValue <= 100 && !centerPercentages.includes(customCenValue)) {
            centerPercentages.push(customCenValue);
            centerPercentages.sort((a, b) => a - b);
        }
    }
    
    // Créer les en-têtes de colonnes
    thead.innerHTML = '<th style="background-color: #2c3e50; color: white; padding: 12px; border: 1px solid #ddd;">% Médecin \\ % Centre</th>';
    centerPercentages.forEach(centerPct => {
        const th = document.createElement('th');
        th.style.cssText = 'background-color: #34495e; color: white; padding: 12px; border: 1px solid #ddd; text-align: center;';
        th.textContent = `${centerPct}%`;
        thead.appendChild(th);
    });
    
    // Vider le tbody
    tbody.innerHTML = '';
    
    // Créer les lignes
    doctorPercentages.forEach(doctorPct => {
        const row = document.createElement('tr');
        
        // Première colonne : % médecin
        const headerCell = document.createElement('td');
        headerCell.style.cssText = 'background-color: #ecf0f1; font-weight: bold; padding: 12px; border: 1px solid #ddd; text-align: center;';
        headerCell.textContent = `${doctorPct}%`;
        row.appendChild(headerCell);
        
        // Autres colonnes : rentabilité
        centerPercentages.forEach(centerPct => {
            const cell = document.createElement('td');
            cell.style.cssText = 'padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold; transition: transform 0.2s, box-shadow 0.2s;';
            
            const total = doctorPct + centerPct;
            
            if (total > 100) {
                cell.textContent = '-';
                cell.style.backgroundColor = '#cfd8dc';
                cell.style.color = '#607d8b';
            } else {
                const profitMargin = 100 - total;
                const profit = (actePrice * profitMargin) / 100;
                const doctorCost = (actePrice * doctorPct / 100);
                const centerCost = (actePrice * centerPct / 100);
                
                // Définir la couleur selon la rentabilité
                let bgColor, textColor;
                if (profitMargin >= 40) {
                    bgColor = '#1b5e20';
                    textColor = 'white';
                } else if (profitMargin >= 30) {
                    bgColor = '#2e7d32';
                    textColor = 'white';
                } else if (profitMargin >= 20) {
                    bgColor = '#66bb6a';
                    textColor = 'white';
                } else if (profitMargin >= 10) {
                    bgColor = '#fdd835';
                    textColor = '#000';
                } else if (profitMargin >= 5) {
                    bgColor = '#ff9800';
                    textColor = 'white';
                } else {
                    bgColor = '#e53935';
                    textColor = 'white';
                }
                
                cell.style.backgroundColor = bgColor;
                cell.style.color = textColor;
                cell.style.cursor = 'pointer';
                cell.textContent = `${profitMargin.toFixed(0)}%`;
                
                // Effet hover pour la heatmap interactive
                cell.onmouseenter = function(e) {
                    this.style.transform = 'scale(1.1)';
                    this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                    this.style.zIndex = '100';
                    
                    const tooltip = document.getElementById('cell-tooltip');
                    if (tooltip) {
                        const tooltipContent = `
                            <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #4fc3f7; padding-bottom: 5px;">
                                📊 Détails de la rentabilité
                            </div>
                            <div><strong>Prix de l'acte :</strong> ${actePrice.toFixed(2)} €</div>
                            <div style="margin-top: 8px; color: #ffab91;">
                                <strong>💰 Coût médecin (${doctorPct}%) :</strong> ${doctorCost.toFixed(2)} €
                            </div>
                            <div style="color: #90caf9;">
                                <strong>🏥 Coût centre (${centerPct}%) :</strong> ${centerCost.toFixed(2)} €
                            </div>
                            <div style="margin-top: 8px; border-top: 1px solid #555; padding-top: 8px;">
                                <strong>Total des coûts :</strong> ${(doctorCost + centerCost).toFixed(2)} €
                            </div>
                            <div style="font-size: 15px; font-weight: bold; color: #81c784; margin-top: 8px;">
                                <strong>✅ Marge nette :</strong> ${profit.toFixed(2)} € (${profitMargin.toFixed(1)}%)
                            </div>
                        `;
                        tooltip.innerHTML = tooltipContent;
                        tooltip.style.position = 'fixed';
                        tooltip.style.left = (e.clientX + 15) + 'px';
                        tooltip.style.top = (e.clientY + 15) + 'px';
                        tooltip.style.display = 'block';
                        tooltip.classList.add('show');
                    }
                };
                
                cell.onmousemove = function(e) {
                    const tooltip = document.getElementById('cell-tooltip');
                    if (tooltip) {
                        tooltip.style.left = (e.clientX + 15) + 'px';
                        tooltip.style.top = (e.clientY + 15) + 'px';
                    }
                };
                
                cell.onmouseleave = function() {
                    this.style.transform = 'scale(1)';
                    this.style.boxShadow = 'none';
                    this.style.zIndex = 'auto';
                    
                    const tooltip = document.getElementById('cell-tooltip');
                    if (tooltip) {
                        tooltip.style.display = 'none';
                        tooltip.classList.remove('show');
                    }
                };
            }
            
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
}
