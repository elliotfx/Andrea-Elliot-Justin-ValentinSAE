// Fonction pour récupérer le token JWT
function getAuthToken() {
    return localStorage.getItem('token');
}

// Fonction pour charger les indicateurs de qualité des données
async function loadDataQualityIndicators() {
    try {
        const token = getAuthToken();
        const response = await fetch('http://localhost:3000/api/data-quality', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erreur réponse serveur:', response.status, errorText);
            throw new Error(`Erreur ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Données qualité reçues:', data);
        
        // Mettre à jour les indicateurs
        updateIndicator('lastName-null', data.lastNameNull.count, data.lastNameNull.percentage);
        updateIndicator('firstName-null', data.firstNameNull.count, data.firstNameNull.percentage);
        updateIndicator('birthDate-invalid', data.birthDateInvalid.count, data.birthDateInvalid.percentage);
        updateIndicator('address-null', data.addressNull.count, data.addressNull.percentage);
        updateIndicator('phone-null', data.phoneNull.count, data.phoneNull.percentage);
        updateIndicator('gender-null', data.genderNull.count, data.genderNull.percentage);
        
        // Mettre à jour le total
        document.getElementById('total-patients-quality').textContent = data.totalPatients;
        
    } catch (error) {
        console.error('Erreur lors du chargement des indicateurs de qualité:', error);
        document.getElementById('quality-indicators').innerHTML = 
            '<p style="color: red; text-align: center;">Erreur lors du chargement des données</p>';
    }
}

// Fonction pour mettre à jour un indicateur
function updateIndicator(id, count, percentage) {
    const countElement = document.getElementById(`${id}-count`);
    const percentageElement = document.getElementById(`${id}-percentage`);
    
    if (countElement) {
        countElement.textContent = count;
    }
    
    if (percentageElement) {
        percentageElement.textContent = `${percentage}%`;
        
        // Appliquer la couleur rouge si le pourcentage > 0
        const percentValue = parseFloat(percentage);
        if (percentValue > 0) {
            percentageElement.style.color = '#dc3545';
        }
    }
    
    // Ajouter une classe de couleur en fonction du pourcentage
    const card = document.getElementById(id);
    if (card) {
        const percentValue = parseFloat(percentage);
        if (percentValue > 10) {
            card.classList.add('quality-bad');
        } else if (percentValue > 5) {
            card.classList.add('quality-warning');
        } else {
            card.classList.add('quality-good');
        }
    }
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initialisation des indicateurs de qualité des données...');
    const token = getAuthToken();
    if (!token) {
        console.error('Aucun token trouvé - redirection vers login');
        document.getElementById('quality-indicators').innerHTML = 
            '<p style="color: red; text-align: center;">Veuillez vous connecter</p>';
        return;
    }
    console.log('Token trouvé, chargement des données...');
    loadDataQualityIndicators();
});
