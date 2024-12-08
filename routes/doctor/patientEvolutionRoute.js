const express = require('express');
const router = express.Router();
const { DateTime } = require('luxon'); // Pour la manipulation des dates

module.exports = (connection) => {
    // Convertit connection.query en fonction basée sur les Promesses
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

    // Route pour récupérer les données d'évolution des patients par médecin et par mois
    router.get('/', async (req, res) => {
        const { doctorId, startDate, endDate } = req.query;

        try {
            console.log(`Récupération de l'évolution des patients pour le médecin ID: ${doctorId}, entre ${startDate} et ${endDate}`);

            // Parse les dates de début et de fin en objets DateTime de Luxon
            const start = DateTime.fromISO(startDate).startOf('month');
            const end = DateTime.fromISO(endDate).endOf('month');

            // Génère un tableau des mois entre les dates de début et de fin
            const months = [];
            let current = start;
            while (current <= end) {
                months.push(current.toFormat('yyyy-MM'));
                current = current.plus({ months: 1 });
            }

            const result = {};

            for (const month of months) {
                // Définit les dates de début et de fin pour le mois
                const startDateMonth = DateTime.fromFormat(month, 'yyyy-MM').startOf('month').toISODate();
                const endDateMonth = DateTime.fromFormat(month, 'yyyy-MM').endOf('month').toISODate();

                // Réutilise les requêtes de la première route, ajustées pour le mois

                // 1. Patients uniques
                const uniquePatientsQuery = `
                    SELECT COUNT(DISTINCT patient_id) AS uniquePatients 
                    FROM visit 
                    WHERE user_activated_id = ? 
                    AND currentLocalTimeAssignment BETWEEN ? AND ?`;

                // 2. Nouveaux patients
                const newPatientsQuery = `
                    WITH new_patients AS (
                        SELECT DISTINCT v1.patient_id
                        FROM visit AS v1
                        WHERE v1.user_activated_id = ? 
                        AND v1.currentLocalTimeAssignment BETWEEN ? AND ?
                        AND NOT EXISTS (
                            SELECT 1
                            FROM visit AS v2
                            WHERE v2.patient_id = v1.patient_id
                            AND v2.user_activated_id = v1.user_activated_id
                            AND v2.currentLocalTimeAssignment < ?
                        )
                    )
                    SELECT COUNT(*) AS new_patients FROM new_patients`;

                // 3. Patients fidèles
                const loyalPatientsQuery = `
                    WITH previous_visits AS (
                        SELECT DISTINCT v1.patient_id
                        FROM visit AS v1
                        WHERE v1.user_activated_id = ? 
                        AND v1.currentLocalTimeAssignment < ?
                    ),
                    current_period_visits AS (
                        SELECT DISTINCT v2.patient_id
                        FROM visit AS v2
                        WHERE v2.user_activated_id = ? 
                        AND v2.currentLocalTimeAssignment BETWEEN ? AND ?
                    )
                    SELECT COUNT(DISTINCT v.patient_id) AS loyal_patients
                    FROM current_period_visits AS v
                    WHERE v.patient_id IN (SELECT patient_id FROM previous_visits)`;

                // 4. Patients en première visite à la clinique
                const firstVisitPatientsQuery = `
                    SELECT COUNT(DISTINCT v1.patient_id) AS firstVisitPatients
                    FROM visit AS v1
                    WHERE v1.user_activated_id = ?
                    AND v1.currentLocalTimeAssignment BETWEEN ? AND ?
                    AND NOT EXISTS (
                        SELECT 1
                        FROM visit AS v2
                        WHERE v2.patient_id = v1.patient_id
                        AND v2.currentLocalTimeAssignment < ?
                    );`;

                // 5. Patients qui ne sont jamais revenus
                const patientsNeverReturnedQuery = `
                    SELECT COUNT(DISTINCT v1.patient_id) AS patients_never_returned
                    FROM visit AS v1
                    WHERE v1.user_activated_id = ?
                    AND v1.currentLocalTimeAssignment BETWEEN ? AND ?
                    AND NOT EXISTS (
                        SELECT 1
                        FROM visit AS v2
                        WHERE v2.patient_id = v1.patient_id
                        AND v2.currentLocalTimeAssignment > ?
                    );`;

                // Exécute les requêtes pour le mois
                const [uniquePatients, newPatients, loyalPatients, firstVisitPatients, patientsNeverReturned] = await Promise.all([
                    query(uniquePatientsQuery, [doctorId, startDateMonth, endDateMonth]),
                    query(newPatientsQuery, [doctorId, startDateMonth, endDateMonth, startDateMonth]),
                    query(loyalPatientsQuery, [doctorId, startDateMonth, doctorId, startDateMonth, endDateMonth]),
                    query(firstVisitPatientsQuery, [doctorId, startDateMonth, endDateMonth, startDateMonth]),
                    query(patientsNeverReturnedQuery, [doctorId, startDateMonth, endDateMonth, endDateMonth])
                ]);

                // Stocke les résultats pour le mois
                result[month] = {
                    totalPatients: uniquePatients[0]?.uniquePatients || 0,
                    newPatients: newPatients[0]?.new_patients || 0,
                    loyalPatients: loyalPatients[0]?.loyal_patients || 0,
                    firstVisitPatients: firstVisitPatients[0]?.firstVisitPatients || 0,
                    patientsNeverReturned: patientsNeverReturned[0]?.patients_never_returned || 0
                };
            }

            // Envoie le résultat au client
            res.json(result);

        } catch (error) {
            console.error('Erreur lors de la récupération des données d\'évolution des patients:', error);
            res.status(500).json({
                error: 'Une erreur est survenue lors de la récupération des données d\'évolution des patients.',
                details: error.message
            });
        }
    });

    return router;
};
