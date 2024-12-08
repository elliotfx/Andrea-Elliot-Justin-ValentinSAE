document.addEventListener("DOMContentLoaded", function() {
    const token = localStorage.getItem('token'); // Récupérer le token JWT du localStorage

    if (!token) {
        console.error('Utilisateur non authentifié');
        window.location.href = 'login.html'; // Rediriger vers la page de connexion si pas de token
        return;
    }

    // Fonction pour formater une date en 'YYYY-MM-DD' sans conversion UTC
    function formatLocalDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Les mois sont indexés à partir de 0
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Fonction pour obtenir la plage de dates du dernier mois écoulé
    function getLastMonthDateRange() {
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

        const startDate = formatLocalDate(startOfLastMonth);
        const endDate = formatLocalDate(endOfLastMonth);

        return { startDate, endDate };
    }

    // Fonction pour ajuster le mois (pour les boutons "Mois précédent" et "Mois suivant")
    function adjustMonth(offset) {
        let startDate = new Date(document.getElementById('start-date').value);
        let endDate = new Date(document.getElementById('end-date').value);

        // Ajuster le mois en fonction de l'offset (-1 pour mois précédent, +1 pour mois suivant)
        startDate.setMonth(startDate.getMonth() + offset);
        endDate.setMonth(endDate.getMonth() + offset);

        // Mettre à jour les champs de date
        document.getElementById('start-date').value = formatLocalDate(startDate);
        document.getElementById('end-date').value = formatLocalDate(endDate);

        // Recharger les données (vous pouvez ajouter ici l'appel pour charger les données correspondantes)
        console.log("Nouvelles dates : ", formatLocalDate(startDate), formatLocalDate(endDate));
        // Vous pouvez appeler ici une fonction comme loadChartData(startDate, endDate); si nécessaire
    }

    // Initialiser les champs de date avec les valeurs par défaut
    const { startDate, endDate } = getLastMonthDateRange();
    document.getElementById('start-date').value = startDate;
    document.getElementById('end-date').value = endDate;

    // Ajouter un événement pour écouter les clics sur le bouton "Appliquer"
    document.getElementById('apply-period').addEventListener('click', function () {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;

        if (startDate && endDate) {
            // Recharger les données en fonction de la période sélectionnée
            console.log("Appliquer période : ", startDate, endDate);
            // Vous pouvez appeler ici une fonction pour recharger les graphiques avec la période sélectionnée
        } else {
            alert('Veuillez sélectionner les deux dates.');
        }
    });

    // Ajouter un événement pour passer au mois précédent
    document.getElementById('previous-month').addEventListener('click', function () {
        adjustMonth(-1); // Mois précédent
    });

    // Ajouter un événement pour passer au mois suivant
    document.getElementById('next-month').addEventListener('click', function () {
        adjustMonth(1); // Mois suivant
    });
});
