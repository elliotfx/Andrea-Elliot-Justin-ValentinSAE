// utilities/utils.js
// Vérification de l'authentification
export function checkAuth() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = 'login.html';
    } else {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp;
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (exp < currentTime) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error("Erreur lors de la vérification du token", error);
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    }
}
// Fonction pour obtenir la plage de dates du mois précédent
export function getLastMonthDateRange() {
    const today = new Date();

    let year = today.getFullYear();
    let month = today.getMonth();

    if (month === 0) {
        month = 11;
        year -= 1;
    } else {
        month -= 1;
    }

    const startOfLastMonth = new Date(year, month, 1);
    const endOfLastMonth = new Date(year, month + 1, 0);

    const startDate = `${startOfLastMonth.getFullYear()}-${String(startOfLastMonth.getMonth() + 1).padStart(2, '0')}-${String(startOfLastMonth.getDate()).padStart(2, '0')}`;
    const endDate = `${endOfLastMonth.getFullYear()}-${String(endOfLastMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfLastMonth.getDate()).padStart(2, '0')}`;

    return { startDate, endDate };
}

// Fonction pour calculer le nombre de mois dans la période sélectionnée
export function calculatePeriodMonths(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth() + 1); // +1 pour inclure le mois en cours
    return months;
}

// Fonction pour obtenir la plage de dates sélectionnée
export function getSelectedDateRange() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    return { startDate, endDate };
}

// Fonction pour vérifier et récupérer le token JWT
export function getAuthToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Vous devez être connecté pour accéder à ces données.');
        window.location.href = 'login.html';  // Redirection si pas de token
        return null;
    }
    return token;
}

// Fonction pour formater les nombres avec une précision décimale
export function formatWaitingTime(value) {
    // Vérifier si la valeur est un nombre valide et supérieure à 0
    return typeof value === 'number' && value > 0 ? value.toFixed(1) + ' min' : '0 min';  // Afficher '0 min' si la valeur est 0 ou invalide
}

// Fonction pour formater les nombres en milliers (k) ou millions (m)
export function formatNumber(value) {
    if (value >= 1e6) {
        return (value / 1e6).toFixed(1) + 'm';  // Pour les millions
    } else if (value >= 1e3) {
        return (value / 1e3).toFixed(1) + 'k';  // Pour les milliers
    } else {
        return value;  // Pour les valeurs inférieures à 1000
    }
}