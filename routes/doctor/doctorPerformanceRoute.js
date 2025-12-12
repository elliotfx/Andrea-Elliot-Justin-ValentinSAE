const express = require('express');
const router = express.Router();

module.exports = (connection) => {
    // Convert connection.query to a Promise-based function with logging
    const query = (sql, params) => new Promise((resolve, reject) => {
        console.log('Executing SQL:', sql);
        console.log('With parameters:', params);

        connection.query(sql, params, (err, results) => {
            if (err) {
                console.error('Error executing query:', err);
                return reject(err);
            }
            resolve(results);
        });
    });

    // Route to fetch doctor performance data
    router.get('/', async (req, res) => {
        const { doctorId, startDate, endDate } = req.query;

        try {
            console.log(`Fetching performance for doctorId: ${doctorId}, between ${startDate} and ${endDate}`);

            // Determine if we're fetching data for all doctors or a specific one
            const isAllDoctors = doctorId === 'all';
            const doctorCondition = isAllDoctors ? '' : 'user_activated_id = ? AND';
            const doctorParams = isAllDoctors ? [] : [doctorId];

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
                select sum(payment.amount) as total_paid
                from payment join visit on visit.id=payment.consultation_id 
                where ${isAllDoctors ? '' : 'user_activated_id = ? AND '}
                visit.currentLocalTimeAssignment BETWEEN ? AND ?;`;
            // 9. Average Waiting Time
            const avgWaitingTimeQuery = `
                SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, visit.arrivalDate, visit.startDate)),2) AS avgWaitingTime 
                FROM visit 
                WHERE ${isAllDoctors ? '' : 'user_activated_id = ? AND '}
                currentLocalTimeAssignment BETWEEN ? AND ?`;

            // 10. actes 
            const actesQuery = `
                WITH visites_patients AS (
                    SELECT description1 AS acte, 
                           COUNT(visit.id) AS nb_visites, 
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
                ORDER BY totalRevenue DESC;`

            // 11. new Patients clinic (1st visit with this doctor)
            const newPatientsClinicQuery = `SELECT COUNT(DISTINCT v1.patient_id) AS uniquePatients
                                        FROM visit AS v1
                                        WHERE ${isAllDoctors ? '' : 'v1.user_activated_id = ? AND '}
                                        v1.currentLocalTimeAssignment BETWEEN ? AND ?
                                        AND NOT EXISTS (
                                            SELECT 1
                                            FROM visit AS v2
                                            WHERE v2.patient_id = v1.patient_id
                                            AND v2.currentLocalTimeAssignment < ?
                                        );`;

            // 12. nombre de visite généré par les patients ayant fait leur premiere viste avec ce medecin
            const VisitsBynewPatientsClinicQuery = `SELECT COUNT(*) AS total_visits
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
                                            );`;

            // 
            const patientsPasRetourQuery = `SELECT COUNT(DISTINCT v1.patient_id) AS patients_never_returned
                                    FROM visit AS v1
                                    WHERE ${isAllDoctors ? '' : 'v1.user_activated_id = ? AND '}
                                    v1.currentLocalTimeAssignment BETWEEN ? AND ?
                                    AND NOT EXISTS (
                                        SELECT 1
                                        FROM visit AS v2
                                        WHERE v2.patient_id = v1.patient_id
                                        AND v2.currentLocalTimeAssignment > ?
                                    );`;
            const total_hoursQuery = `SELECT  ${isAllDoctors ? '' : 'user_activated_id,'}ROUND(SUM(TIMESTAMPDIFF(MINUTE, visit.startDate, visit.endDate))/60,2) AS hoursWorked 
                                        FROM dental_diagram_udc 
                                        JOIN dental_diagram ON dental_diagram.id = dental_diagram_udc.dental_diagram_id
                                        JOIN udc ON udc.id = dental_diagram_udc.udc_id
                                        JOIN visit ON visit.id = dental_diagram.consultation_id
                                        where ${isAllDoctors ? '' : 'user_activated_id = ? AND '}
                                        visit.currentLocalTimeAssignment BETWEEN ? AND ?;`;

            // Build parameter arrays based on whether we're filtering by doctor
            const uniquePatientsParams = isAllDoctors ? [startDate, endDate] : [doctorId, startDate, endDate];
            const totalVisitsParams = isAllDoctors ? [startDate, endDate] : [doctorId, startDate, endDate];
            const newPatientsParams = isAllDoctors ? [startDate, endDate, startDate] : [doctorId, startDate, endDate, startDate];
            const visitsGenParams = isAllDoctors ? [startDate, endDate, startDate, startDate, endDate] : [doctorId, startDate, endDate, startDate, doctorId, startDate, endDate];
            const loyalPatientsParams = isAllDoctors ? [startDate, startDate, endDate] : [doctorId, startDate, doctorId, startDate, endDate];
            const followUpParams = isAllDoctors ? [startDate, startDate, endDate] : [doctorId, startDate, doctorId, startDate, endDate, doctorId];
            const hoursWorkedParams = isAllDoctors ? [startDate, endDate] : [doctorId, startDate, endDate];
            const totalRevenueParams = isAllDoctors ? [startDate, endDate] : [doctorId, startDate, endDate];
            const avgWaitingParams = isAllDoctors ? [startDate, endDate] : [doctorId, startDate, endDate];
            const actesParams = isAllDoctors ? [startDate, endDate, startDate, endDate] : [doctorId, startDate, endDate, doctorId, startDate, endDate];
            const newPatientsClinicParams = isAllDoctors ? [startDate, endDate, startDate] : [doctorId, startDate, endDate, startDate];
            const visitsByNewPatientsParams = isAllDoctors ? [startDate, endDate, startDate] : [doctorId, startDate, endDate, startDate];
            const patientsPasRetourParams = isAllDoctors ? [startDate, endDate, endDate] : [doctorId, startDate, endDate, endDate];
            const totalHoursParams = isAllDoctors ? [startDate, endDate] : [doctorId, startDate, endDate];

            // Execute all queries in parallel for better performance
            const results = await Promise.all([
                query(uniquePatientsQuery, uniquePatientsParams),
                query(totalVisitsQuery, totalVisitsParams),
                query(newPatientsQuery, newPatientsParams),
                query(loyalPatientsQuery, loyalPatientsParams),
                query(hoursWorkedQuery, hoursWorkedParams),
                query(total_hoursQuery, totalHoursParams),
                query(totalRevenueQuery, totalRevenueParams),
                query(avgWaitingTimeQuery, avgWaitingParams),
                query(actesQuery, actesParams),
                query(newPatientsClinicQuery, newPatientsClinicParams),
                query(VisitsBynewPatientsClinicQuery, visitsByNewPatientsParams),
                query(patientsPasRetourQuery, patientsPasRetourParams)
            ]);

            const [uniquePatients, totalVisits, newPatients, loyalPatients, hoursWorked, total_hours, totalRevenue, avgWaitingTime, actes, newPatientsClinic, VisitsBynewPatientsClinic, patientsPasRetour] = results;


            const hoursWorkedTotal = (hoursWorked[0].hoursWorked * totalVisits[0]?.totalVisits) / 60;
            // Handle potential division by zero for revenue per hour
            const revenuePerHour = hoursWorked[0].hoursWorked
                ? (totalRevenue[0].total_paid / (hoursWorkedTotal)).toFixed(2)
                : 0;

            // Send the result back to the client
            res.json({
                stats: {
                    uniquePatients: uniquePatients[0]?.uniquePatients || 0,
                    totalVisits: totalVisits[0]?.totalVisits || 0,
                    newPatients: newPatients[0]?.new_patients || 0,
                    loyalPatients: loyalPatients[0]?.loyal_patients || 0,
                    hoursWorked: hoursWorked[0]?.hoursWorked || 0,
                    totalPaidForConsultations: totalRevenue[0]?.total_paid || 0,
                    revenuePerHour: revenuePerHour,
                    avgWaitingTime: avgWaitingTime[0]?.avgWaitingTime || 0,
                    patientsPremiereVisite: newPatientsClinic[0]?.uniquePatients || 0,
                    VisitsBynewPatientsClinic: VisitsBynewPatientsClinic[0]?.total_visits || 0,
                    total_hours: total_hours[0]?.hoursWorked || 0,
                    patientsPasRetour: patientsPasRetour[0]?.patients_never_returned || 0
                },
                actes: actes,

            });
        } catch (error) {
            console.error('Erreur lors de la récupération des données du médecin:', error);
            res.status(500).json({
                error: 'An error occurred while fetching the doctor performance data.',
                details: error.message
            });
        }
    });

    // Route to fetch available doctors
    router.get('/api/doctors', async (req, res) => {
        try {
            const doctorsQuery = 'SELECT id, firstName, lastName FROM user WHERE role = "doctor" and user.enabled=0';
            const doctors = await query(doctorsQuery);
            res.json(doctors);
        } catch (error) {
            console.error('Erreur lors de la récupération des médecins:', error);
            res.status(500).json({
                error: 'An error occurred while fetching the doctors data.',
                details: error.message
            });
        }
    });

    // Route to fetch visits by day of year for yearly comparison chart
    router.get('/visits-by-day-of-year', async (req, res) => {
        try {
            const { doctorId } = req.query;

            if (!doctorId) {
                return res.status(400).json({ error: 'Doctor ID is required' });
            }

            const isAllDoctors = doctorId === 'all';

            // Query to get visits grouped by day of year and year
            const visitsByDayQuery = `
                SELECT 
                    YEAR(currentLocalTimeAssignment) as year,
                    DAYOFYEAR(currentLocalTimeAssignment) as day_of_year,
                    COUNT(*) as visit_count
                FROM visit
                ${isAllDoctors ? '' : 'WHERE user_activated_id = ?'}
                GROUP BY YEAR(currentLocalTimeAssignment), DAYOFYEAR(currentLocalTimeAssignment)
                ORDER BY year, day_of_year
            `;

            const results = await query(visitsByDayQuery, isAllDoctors ? [] : [doctorId]);

            // Transform data into format suitable for D3.js multi-line chart
            const dataByYear = {};
            results.forEach(row => {
                if (!dataByYear[row.year]) {
                    dataByYear[row.year] = [];
                }
                dataByYear[row.year].push({
                    dayOfYear: row.day_of_year,
                    visitCount: row.visit_count
                });
            });

            res.json(dataByYear);
        } catch (error) {
            console.error('Erreur lors de la récupération des visites par jour:', error);
            res.status(500).json({
                error: 'An error occurred while fetching visits by day of year.',
                details: error.message
            });
        }
    });

    return router;
};

