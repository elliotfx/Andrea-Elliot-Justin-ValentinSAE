// uiUpdate.js




export function updateStats(stats) {
    // Displaying unique patients and total visits with ratio
    document.getElementById('unique-patients').textContent = stats.uniquePatients;
    document.getElementById('total-visits').textContent = `${stats.totalVisits} (${(stats.totalVisits / stats.uniquePatients).toFixed(2)} v/p)`;

    // Displaying new patients with percentage of total unique patients
    document.getElementById('new-patients').textContent = `${stats.newPatients} (${((stats.newPatients / stats.uniquePatients) * 100).toFixed(2)}%)`;

    // Displaying loyal patients with percentage of total unique patients
    document.getElementById('loyal-patients').textContent = `${stats.loyalPatients} (${((stats.loyalPatients / stats.uniquePatients) * 100).toFixed(2)}%)`;

    // Displaying total revenue with the € currency and 2 decimal places
    document.getElementById('total-revenue-consultations').textContent = parseFloat(stats.totalPaidForConsultations).toFixed(2) + ' €';

    // Displaying revenue per hour
    document.getElementById('revenue-per-hour').textContent = stats.revenuePerHour + ' €/heure';

    // Displaying average hours worked
    document.getElementById('hours-worked').textContent = stats.hoursWorked + ' minutes';

    document.getElementById('total-hours-worked').textContent = stats.total_hours + ' heures';


    // Displaying average waiting time
    document.getElementById('avg-waiting-time').textContent = stats.avgWaitingTime + ' minutes';

    // Removed: patients-premiere-visite indicator
    // document.getElementById('patients-premiere-visite').textContent = `${stats.patientsPremiereVisite} (${((stats.patientsPremiereVisite / stats.uniquePatients) * 100).toFixed(2)}%)`;

    // Removed: visites-premiere-visite indicator
    // document.getElementById('visites-premiere-visite').textContent = `${stats.VisitsBynewPatientsClinic} (${(stats.VisitsBynewPatientsClinic / stats.patientsPremiereVisite).toFixed(2)} v/p)`;

    // Displaying first-visit patients who didn't return as a percentage of unique patients
    document.getElementById('patients-premiere-visite-pas-retour').textContent = `${stats.patientsPasRetour} (${((stats.patientsPasRetour / stats.uniquePatients) * 100).toFixed(2)}%)`;
}


export function updateTable(data) {
    const table = document.getElementById('actes-table');
    if (!table) return; // Element doesn't exist on this page
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${row.acte}</td><td>${row.uniquePatients}</td><td>${row.totalActs}</td><td>${parseFloat(row.totalRevenue || 0).toFixed(2)} €</td><td>${row.total_hours} heures</td><td>${row.avg_cost_per_hour} €</td>`;
        tbody.appendChild(tr);
    });
}