document.getElementById('apply-period').addEventListener('click', function() {
    const doctorId = document.getElementById('doctor-select').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (!doctorId || !startDate || !endDate) {
        alert('Veuillez sélectionner un médecin et une plage horaire.');
        return;
    }

    const token = localStorage.getItem('token'); // Récupérer le token JWT du localStorage

    if (!token) {
        console.error('Utilisateur non authentifié');
        window.location.href = 'login.html'; // Rediriger vers la page de connexion si pas de token
        return;
    }

    // Appel à l'API pour récupérer les données de performance du médecin
    fetch(`/api/doctor-performance?doctorId=${doctorId}&startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, // Ajouter le token JWT dans l'en-tête Authorization
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Mettre à jour les cartes des statistiques existantes
        document.getElementById('unique-patients').textContent = data.uniquePatients;
        document.getElementById('total-visits').textContent = data.totalVisits;
        document.getElementById('new-patients').textContent = data.newPatients;
        document.getElementById('visits-generated-by-new-patients').textContent = data.visitsGeneratedByNewPatients;
        document.getElementById('loyal-patients').textContent = data.loyalPatients;
        document.getElementById('follow-up-visits').textContent = data.followUpVisits;
        document.getElementById('total-revenue-actes').textContent = data.totalPaidForActes + ' €';
        document.getElementById('total-visits-with-actes').textContent = data.totalVisitsWithActes;
        document.getElementById('total-revenue-consultations').textContent = data.totalPaidForConsultations + ' €';
        document.getElementById('total-consultations').textContent = data.totalConsultations;
        document.getElementById('hours-worked').textContent = data.hoursWorked + ' heures';
        document.getElementById('revenue-per-hour').textContent = data.revenuePerHour + ' €/heure';
        document.getElementById('avg-waiting-time').textContent = data.avgWaitingTime + ' minutes';
        document.getElementById('patients-premiere-visite').textContent = data.patientsPremiereVisite;
        document.getElementById('patients-autre-medecin-premiere-visite').textContent = data.patientsAutreMedecinPremiereVisite;
        document.getElementById('patients-deux-visites-meme-medecin').textContent = data.patientsDeuxVisitesMemeMedecin;
        document.getElementById('patients-premiere-visite-pas-retour').textContent = data.patientsPremiereVisitePasRetour;

        // Mettre à jour le tableau des actes
        updateActsTable(data.actes);
    })
    .catch(error => console.error('Erreur lors de la récupération des données:', error));

    // Appel à l'API pour récupérer les données d'analyse du temps du médecin
    fetch(`/api/doctor-time-analysis?doctorId=${doctorId}&startDate=${startDate}&endDate=${endDate}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, // Ajouter le token JWT dans l'en-tête Authorization
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log("Données d'analyse du temps :", data); // Ajoutez ce log
        // Mettre à jour le graphique d'évolution du temps
        updateTimeAnalysisChart(data);
    })
    .catch(error => console.error('Erreur lors de la récupération des données de temps:', error));
});

// Fonction pour mettre à jour le graphique d'analyse du temps avec D3.js
function updateTimeAnalysisChart(timeAnalysisData) {
    const svg = d3.select('#performance-chart');
    svg.selectAll('*').remove(); // Effacer les anciens éléments du graphique

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const g = svg.append('g')
                 .attr('transform', `translate(${margin.left},${margin.top})`);

    // Transformer l'année et le numéro de semaine en date
    const parseWeekData = data => {
        const firstDayOfYear = new Date(data.year, 0, 1);
        const dayInMillis = 86400000; // Millisecondes dans un jour
        const daysOffset = (data.week_number - 1) * 7;
        return new Date(firstDayOfYear.getTime() + daysOffset * dayInMillis);
    };

    const formattedData = timeAnalysisData.map(d => ({
        date: parseWeekData(d),
        avgWaitingTime: parseFloat(d.avg_waiting_time_minutes),
        avgPatientTime: parseFloat(d.avg_patient_time_minutes)
    }));

    const x = d3.scaleTime()
                .domain(d3.extent(formattedData, d => d.date))
                .range([0, width]);

    const y = d3.scaleLinear()
                .domain([0, d3.max(formattedData, d => Math.max(d.avgWaitingTime, d.avgPatientTime))])
                .range([height, 0]);

    // Axe X
    g.append('g')
     .attr('transform', `translate(0,${height})`)
     .call(d3.axisBottom(x).ticks(6));

    // Axe Y
    g.append('g')
     .call(d3.axisLeft(y));

    // Ligne pour le temps d'attente
    const lineWaitingTime = d3.line()
                              .x(d => x(d.date))
                              .y(d => y(d.avgWaitingTime));

    g.append('path')
     .datum(formattedData)
     .attr('fill', 'none')
     .attr('stroke', 'steelblue')
     .attr('stroke-width', 2)
     .attr('d', lineWaitingTime);

    // Ligne pour le temps patient
    const linePatientTime = d3.line()
                              .x(d => x(d.date))
                              .y(d => y(d.avgPatientTime));

    g.append('path')
     .datum(formattedData)
     .attr('fill', 'none')
     .attr('stroke', 'green')
     .attr('stroke-width', 2)
     .attr('d', linePatientTime);

    // Ajout des labels
    g.append('text')
     .attr('x', width / 2)
     .attr('y', height + margin.bottom)
     .attr('text-anchor', 'middle')
     .text('Date');

    g.append('text')
     .attr('transform', 'rotate(-90)')
     .attr('x', -height / 2)
     .attr('y', -margin.left + 15)
     .attr('text-anchor', 'middle')
     .text('Temps (minutes)');

    // Ajout des légendes
    const legend = svg.append('g')
                      .attr('class', 'legend')
                      .attr('transform', `translate(${width - 100}, ${margin.top})`);

    // Légende Temps d'attente
    legend.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 18)
          .attr('height', 18)
          .style('fill', 'steelblue');

    legend.append('text')
          .attr('x', 25)
          .attr('y', 12)
          .attr('dy', '0.35em')
          .text('Temps d\'attente');

    // Légende Temps patient
    legend.append('rect')
          .attr('x', 0)
          .attr('y', 25)
          .attr('width', 18)
          .attr('height', 18)
          .style('fill', 'green');

    legend.append('text')
          .attr('x', 25)
          .attr('y', 37)
          .attr('dy', '0.35em')
          .text('Temps patient');
}

// Fonction pour mettre à jour le tableau des actes
function updateActsTable(actsData) {
    const tableBody = document.getElementById('acts-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Effacer les lignes existantes

    actsData.forEach(act => {
        const row = document.createElement('tr');
        const actNameCell = document.createElement('td');
        const uniquePatientsCell = document.createElement('td');
        const actCountCell = document.createElement('td');
        const actRevenueCell = document.createElement('td');

        actNameCell.textContent = act.acte;
        uniquePatientsCell.textContent = act.uniquePatients;
        actCountCell.textContent = act.totalActs;
        actRevenueCell.textContent = act.totalRevenue + ' €';

        row.appendChild(actNameCell);
        row.appendChild(uniquePatientsCell);
        row.appendChild(actCountCell);
        row.appendChild(actRevenueCell);
        tableBody.appendChild(row);
    });
}

// Remplir le menu déroulant des médecins disponibles
// Fonction pour remplir le menu déroulant des médecins disponibles
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token'); // Récupérer le token JWT du localStorage

    if (!token) {
        console.error('Utilisateur non authentifié');
        window.location.href = 'login.html'; // Rediriger vers la page de connexion si pas de token
        return;
    }

    // Appel à l'API pour récupérer la liste des médecins
    fetch('/api/doctors', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, // Ajouter le token JWT dans l'en-tête Authorization
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
});