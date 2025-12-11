const express = require('express');
const router = express.Router();
const { DateTime } = require('luxon'); // Assurez-vous d'avoir installé Luxon

module.exports = (connection) => {
    // Convertit connection.query en fonction basée sur les Promesses avec journalisation
    const query = (sql, params) => new Promise((resolve, reject) => {
        console.log('Exécution de la requête SQL:', sql);
        console.log('Avec les paramètres:', params);
        connection.query(sql, params, (err, results) => {
            if (err) {
                console.error('Erreur lors de l\'exécution de la requête:', err);
                return reject(err);
            }
            resolve(results);
        });
    });

    // Nouvelle route pour récupérer les statistiques mensuelles
    router.get('/', async (req, res) => {
        const { doctorId, startDate, endDate } = req.query;

        try {
            console.log(`Récupération des statistiques mensuelles pour le médecin ID: ${doctorId}, entre ${startDate} et ${endDate}`);

            // Determine if we're fetching data for all doctors or a specific one
            const isAllDoctors = doctorId === 'all';

            // Parse les dates de début et de fin en utilisant Luxon
            const start = DateTime.fromISO(startDate).startOf('month');
            const end = DateTime.fromISO(endDate).endOf('month');

            // Génère un tableau des mois entre startDate et endDate
            const months = [];
            let current = start;
            while (current <= end) {
                months.push(current.toFormat('yyyy-MM'));
                current = current.plus({ months: 1 });
            }

            console.time('Monthly Stats Total Time');

            // Traiter les mois par lots de 3 pour éviter de surcharger la DB
            const batchSize = 3;
            const allResults = [];
            
            for (let i = 0; i < months.length; i += batchSize) {
                const batch = months.slice(i, i + batchSize);
                const batchPromises = batch.map(async (month) => {
                    const startDateMonth = DateTime.fromFormat(month, 'yyyy-MM').startOf('month').toISODate();
                    const endDateMonth = DateTime.fromFormat(month, 'yyyy-MM').endOf('month').toISODate();

                // Ajuste les requêtes pour le mois en utilisant vos requêtes originales avec les paramètres de date ajustés

                // 1. Unique Patients
                const uniquePatientsQuery = `
                    SELECT COUNT(DISTINCT patient_id) AS uniquePatients 
                    FROM visit 
                    WHERE ${isAllDoctors ? '' : 'user_activated_id = ? AND '}
                    currentLocalTimeAssignment BETWEEN ? AND ?`;

                // 2. Total Visits
                const totalVisitsQuery = `
                    SELECT COUNT(*) AS totalVisits 
                    FROM visit 
                    WHERE ${isAllDoctors ? '' : 'user_activated_id = ? AND '}
                    currentLocalTimeAssignment BETWEEN ? AND ?`;

                // 3. New Patients
                const newPatientsQuery = `
                    WITH new_patients AS (
                        SELECT DISTINCT v1.patient_id
                        FROM visit AS v1
                        WHERE ${isAllDoctors ? '' : 'v1.user_activated_id = ? AND '}
                        v1.currentLocalTimeAssignment BETWEEN ? AND ?
                        AND NOT EXISTS (
                            SELECT 1
                            FROM visit AS v2
                            WHERE v2.patient_id = v1.patient_id
                            ${isAllDoctors ? '' : 'AND v2.user_activated_id = v1.user_activated_id'}
                            AND v2.currentLocalTimeAssignment < ?
                        )
                    )
                    SELECT COUNT(*) AS new_patients FROM new_patients`;

                // 4. Loyal Patients
                const loyalPatientsQuery = `
                    WITH previous_visits AS (
                        SELECT DISTINCT v1.patient_id
                        FROM visit AS v1
                        WHERE ${isAllDoctors ? '' : 'v1.user_activated_id = ? AND '}
                        v1.currentLocalTimeAssignment < ?
                    ),
                    current_period_visits AS (
                        SELECT DISTINCT v2.patient_id
                        FROM visit AS v2
                        WHERE ${isAllDoctors ? '' : 'v2.user_activated_id = ? AND '}
                        v2.currentLocalTimeAssignment BETWEEN ? AND ?
                    )
                    SELECT COUNT(DISTINCT v.patient_id) AS loyal_patients
                    FROM current_period_visits AS v
                    WHERE v.patient_id IN (SELECT patient_id FROM previous_visits)`;

                // 5. Hours Worked
                const hoursWorkedQuery = `
                    SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, visit.startDate, visit.endDate)),2) AS hoursWorked 
                    FROM visit 
                    WHERE ${isAllDoctors ? '' : 'user_activated_id = ? AND '}
                    currentLocalTimeAssignment BETWEEN ? AND ?`;

                // 8. Total Revenue for Acts and Consultations
                const totalRevenueQuery = `
                    SELECT SUM(payment.amount) AS total_paid
                    FROM payment JOIN visit ON visit.id=payment.consultation_id 
                    WHERE ${isAllDoctors ? '' : 'user_activated_id = ? AND '}
                    visit.currentLocalTimeAssignment BETWEEN ? AND ?`;

                // 9. Average Waiting Time
                const avgWaitingTimeQuery = `
                    SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, visit.arrivalDate, visit.startDate)),2) AS avgWaitingTime 
                    FROM visit 
                    WHERE ${isAllDoctors ? '' : 'user_activated_id = ? AND '}
                    currentLocalTimeAssignment BETWEEN ? AND ?`;

                // 10. Actes
                const actesQuery = `
                    WITH visites_patients AS (
                        SELECT description1 AS acte, 
                               COUNT(DISTINCT visit.id) AS nb_visites, 
                               COUNT(DISTINCT dental_diagram.patient_id) AS nb_patients,
                               SUM(TIMESTAMPDIFF(MINUTE, visit.startdate, visit.enddate))/60 AS total_hours
                        FROM dental_diagram_udc 
                        JOIN dental_diagram ON dental_diagram.id = dental_diagram_udc.dental_diagram_id
                        JOIN udc ON udc.id = dental_diagram_udc.udc_id
                        JOIN visit ON visit.id = dental_diagram.consultation_id
                        WHERE ${isAllDoctors ? '' : 'user_activated_id = ? AND '}
                        visit.currentLocalTimeAssignment BETWEEN ? AND ?
                        GROUP BY description1
                    ),
                    paiements AS (
                        SELECT description1 AS acte, 
                               SUM(payment.amount) AS revenus
                        FROM dental_diagram_udc 
                        JOIN dental_diagram ON dental_diagram.id = dental_diagram_udc.dental_diagram_id
                        JOIN udc ON udc.id = dental_diagram_udc.udc_id
                        JOIN visit ON visit.id = dental_diagram.consultation_id
                        LEFT JOIN payment ON payment.consultation_id = visit.id
                        WHERE ${isAllDoctors ? '' : 'user_activated_id = ? AND '}
                        visit.currentLocalTimeAssignment BETWEEN ? AND ?
                        GROUP BY description1
                    )
                    SELECT v.acte as acte, 
                           v.nb_visites as totalActs, 
                           v.nb_patients as uniquePatients, 
                           COALESCE(p.revenus, 0) AS totalRevenue,
                           ROUND(v.total_hours,2) AS total_hours,
                           ROUND((COALESCE(p.revenus, 0) / NULLIF(v.total_hours, 0)),2) AS avg_cost_per_hour
                    FROM visites_patients v
                    LEFT JOIN paiements p ON v.acte = p.acte
                    ORDER BY totalRevenue DESC`;

                // 11. New Patients Clinic (1st visit to the clinic)
                const newPatientsClinicQuery = `
                    SELECT COUNT(DISTINCT v1.patient_id) AS uniquePatients
                    FROM visit AS v1
                    WHERE ${isAllDoctors ? '' : 'v1.user_activated_id = ? AND '}
                    v1.currentLocalTimeAssignment BETWEEN ? AND ?
                    AND NOT EXISTS (
                        SELECT 1
                        FROM visit AS v2
                        WHERE v2.patient_id = v1.patient_id
                        AND v2.currentLocalTimeAssignment < ?
                    )`;

                // 12. Visits by Patients with First Visit to the Clinic
                const visitsByNewPatientsClinicQuery = `
                    SELECT COUNT(*) AS total_visits
                    FROM visit AS v1
                    WHERE v1.patient_id IN (
                        SELECT v2.patient_id
                        FROM visit AS v2
                        WHERE ${isAllDoctors ? '' : 'v2.user_activated_id = ? AND '}
                        v2.currentLocalTimeAssignment BETWEEN ? AND ?
                        AND NOT EXISTS (
                            SELECT 1
                            FROM visit AS v3
                            WHERE v3.patient_id = v2.patient_id
                            AND v3.currentLocalTimeAssignment < ?
                        )
                    )`;

                // 13. Patients Who Never Returned
                const patientsPasRetourQuery = `
                    SELECT COUNT(DISTINCT v1.patient_id) AS patients_never_returned
                    FROM visit AS v1
                    WHERE ${isAllDoctors ? '' : 'v1.user_activated_id = ? AND '}
                    v1.currentLocalTimeAssignment BETWEEN ? AND ?
                    AND NOT EXISTS (
                        SELECT 1
                        FROM visit AS v2
                        WHERE v2.patient_id = v1.patient_id
                        AND v2.currentLocalTimeAssignment > ?
                    )`;

                // 14. Total Hours
                const totalHoursQuery = `
                    SELECT ${isAllDoctors ? '' : 'user_activated_id,'}
                           ROUND(SUM(TIMESTAMPDIFF(MINUTE, visit.startDate, visit.endDate))/60,2) AS hoursWorked 
                    FROM dental_diagram_udc 
                    JOIN dental_diagram ON dental_diagram.id = dental_diagram_udc.dental_diagram_id
                    JOIN udc ON udc.id = dental_diagram_udc.udc_id
                    JOIN visit ON visit.id = dental_diagram.consultation_id
                    WHERE ${isAllDoctors ? '' : 'user_activated_id = ? AND '}
                    visit.currentLocalTimeAssignment BETWEEN ? AND ?`;

                // Build parameter arrays based on doctorId
                const uniquePatientsParams = isAllDoctors ? [startDateMonth, endDateMonth] : [doctorId, startDateMonth, endDateMonth];
                const totalVisitsParams = isAllDoctors ? [startDateMonth, endDateMonth] : [doctorId, startDateMonth, endDateMonth];
                const newPatientsParams = isAllDoctors ? [startDateMonth, endDateMonth, startDateMonth] : [doctorId, startDateMonth, endDateMonth, startDateMonth];
                const visitsGenParams = isAllDoctors ? [startDateMonth, endDateMonth, startDateMonth] : [doctorId, startDateMonth, endDateMonth, startDateMonth];
                const loyalPatientsParams = isAllDoctors ? [startDateMonth, startDateMonth, endDateMonth] : [doctorId, startDateMonth, doctorId, startDateMonth, endDateMonth];
                const followUpParams = isAllDoctors ? [startDateMonth, startDateMonth, endDateMonth] : [doctorId, startDateMonth, doctorId, startDateMonth, endDateMonth, doctorId];
                const hoursWorkedParams = isAllDoctors ? [startDateMonth, endDateMonth] : [doctorId, startDateMonth, endDateMonth];
                const totalHoursParams = isAllDoctors ? [startDateMonth, endDateMonth] : [doctorId, startDateMonth, endDateMonth];
                const totalRevenueParams = isAllDoctors ? [startDateMonth, endDateMonth] : [doctorId, startDateMonth, endDateMonth];
                const avgWaitingParams = isAllDoctors ? [startDateMonth, endDateMonth] : [doctorId, startDateMonth, endDateMonth];
                const actesParams = isAllDoctors ? [startDateMonth, endDateMonth, startDateMonth, endDateMonth] : [doctorId, startDateMonth, endDateMonth, doctorId, startDateMonth, endDateMonth];
                const newPatientsClinicParams = isAllDoctors ? [startDateMonth, endDateMonth, startDateMonth] : [doctorId, startDateMonth, endDateMonth, startDateMonth];
                const visitsByNewPatientsParams = isAllDoctors ? [startDateMonth, endDateMonth, startDateMonth] : [doctorId, startDateMonth, endDateMonth, startDateMonth];
                const patientsPasRetourParams = isAllDoctors ? [startDateMonth, endDateMonth, endDateMonth] : [doctorId, startDateMonth, endDateMonth, endDateMonth];

                // Exécute les requêtes pour le mois
                const [
                    uniquePatients,
                    totalVisits,
                    newPatients,
                    loyalPatients,
                    hoursWorked,
                    totalHours,
                    totalRevenue,
                    avgWaitingTime,
                    actes,
                    newPatientsClinic,
                    visitsByNewPatientsClinic,
                    patientsPasRetour,
                ] = await Promise.all([
                    query(uniquePatientsQuery, uniquePatientsParams),
                    query(totalVisitsQuery, totalVisitsParams),
                    query(newPatientsQuery, newPatientsParams),
                    query(loyalPatientsQuery, loyalPatientsParams),
                    query(hoursWorkedQuery, hoursWorkedParams),
                    query(totalHoursQuery, totalHoursParams),
                    query(totalRevenueQuery, totalRevenueParams),
                    query(avgWaitingTimeQuery, avgWaitingParams),
                    query(actesQuery, actesParams),
                    query(newPatientsClinicQuery, newPatientsClinicParams),
                    query(visitsByNewPatientsClinicQuery, visitsByNewPatientsParams),
                    query(patientsPasRetourQuery, patientsPasRetourParams),
                ]);

                // Calcule hoursWorkedTotal et revenuePerHour
                const totalVisitsCount = totalVisits[0]?.totalVisits || 0;
                const hoursWorkedValue = hoursWorked[0]?.hoursWorked || 0;
                const totalRevenueValue = totalRevenue[0]?.total_paid || 0;

                const hoursWorkedTotal = (hoursWorkedValue * totalVisitsCount) / 60;
                const revenuePerHour = hoursWorkedTotal > 0
                    ? (totalRevenueValue / hoursWorkedTotal).toFixed(2)
                    : '0.00';

                // Retourner les résultats pour ce mois
                return {
                    month,
                    data: {
                        stats: {
                            uniquePatients: uniquePatients[0]?.uniquePatients || 0,
                            totalVisits: totalVisitsCount,
                            newPatients: newPatients[0]?.new_patients || 0,
                            loyalPatients: loyalPatients[0]?.loyal_patients || 0,
                            visitDuration: hoursWorkedValue,
                            totalPaidForConsultations: totalRevenueValue,
                            revenuePerHour: revenuePerHour,
                            avgWaitingTime: avgWaitingTime[0]?.avgWaitingTime || 0,
                            patientsPremiereVisite: newPatientsClinic[0]?.uniquePatients || 0,
                            VisitsByNewPatientsClinic: visitsByNewPatientsClinic[0]?.total_visits || 0,
                            total_hours: totalHours[0]?.hoursWorked || 0,
                            patientsPasRetour: patientsPasRetour[0]?.patients_never_returned || 0
                        },
                        actes: actes,
                    }
                };
            });

            const batchResults = await Promise.all(batchPromises);
            allResults.push(...batchResults);
        }

            // Convertir en objet avec les mois comme clés
            const result = {};
            allResults.forEach(({ month, data }) => {
                result[month] = data;
            });

            console.timeEnd('Monthly Stats Total Time');

            // Envoie le résultat combiné au client
            res.json(result);

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques mensuelles:', error);
            res.status(500).json({
                error: 'Une erreur est survenue lors de la récupération des statistiques mensuelles.',
                details: error.message,
            });
        }
    });

    return router;
};
