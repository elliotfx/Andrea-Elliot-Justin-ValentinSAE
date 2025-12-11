const express = require('express');
const router = express.Router();

module.exports = (connection) => {
    // Convert connection.query to a Promise-based function
    const query = (sql, params) => new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });

    // Route pour récupérer les métriques de benchmark de tous les médecins
    router.get('/', async (req, res) => {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Les dates de début et de fin sont requises.' });
        }

        try {
            // Récupérer la liste des médecins actifs
            const doctors = await query(`
                SELECT id, firstName, lastName 
                FROM user 
                WHERE user.discr = "Doctor" 
                AND user.enabled = 1
                AND user.firstName NOT IN ('User', 'Technologie', 'ADMIN')
                AND user.lastName NOT IN ('RADIO', 'KBM', 'ADMIN')
            `);

            // Récupérer les métriques pour chaque médecin
            const benchmarkData = await Promise.all(doctors.map(async (doctor) => {
                const doctorId = doctor.id;

                // 1. Nombre de patients uniques
                const [patientsResult] = await query(`
                    SELECT COUNT(DISTINCT patient_id) AS uniquePatients 
                    FROM visit 
                    WHERE user_activated_id = ? 
                    AND currentLocalTimeAssignment BETWEEN ? AND ?
                `, [doctorId, startDate, endDate]);

                // 2. Nombre total de visites
                const [visitsResult] = await query(`
                    SELECT COUNT(*) AS totalVisits 
                    FROM visit 
                    WHERE user_activated_id = ? 
                    AND currentLocalTimeAssignment BETWEEN ? AND ?
                `, [doctorId, startDate, endDate]);

                // 3. Revenus totaux
                const [revenueResult] = await query(`
                    SELECT COALESCE(SUM(payment.amount), 0) AS totalRevenue
                    FROM payment 
                    JOIN visit ON visit.id = payment.consultation_id 
                    WHERE user_activated_id = ?
                    AND visit.currentLocalTimeAssignment BETWEEN ? AND ?
                `, [doctorId, startDate, endDate]);

                // 4. Temps d'attente moyen
                const [waitingTimeResult] = await query(`
                    SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, visit.arrivalDate, visit.startDate)), 2) AS avgWaitingTime 
                    FROM visit 
                    WHERE user_activated_id = ? 
                    AND currentLocalTimeAssignment BETWEEN ? AND ?
                    AND arrivalDate IS NOT NULL
                    AND startDate IS NOT NULL
                `, [doctorId, startDate, endDate]);

                // 5. Taux de ponctualité (RDV commencés à l'heure ou en avance)
                const [punctualityResult] = await query(`
                    SELECT 
                        COUNT(CASE WHEN TIMESTAMPDIFF(MINUTE, currentLocalTimeAssignment, startDate) <= 5 THEN 1 END) * 100.0 / 
                        NULLIF(COUNT(*), 0) AS punctualityRate
                    FROM visit 
                    WHERE user_activated_id = ? 
                    AND currentLocalTimeAssignment BETWEEN ? AND ?
                    AND startDate IS NOT NULL
                `, [doctorId, startDate, endDate]);

                // 6. Durée moyenne de consultation
                const [consultDurationResult] = await query(`
                    SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, visit.startDate, visit.endDate)), 2) AS avgConsultDuration 
                    FROM visit 
                    WHERE user_activated_id = ? 
                    AND currentLocalTimeAssignment BETWEEN ? AND ?
                    AND startDate IS NOT NULL
                    AND endDate IS NOT NULL
                `, [doctorId, startDate, endDate]);

                return {
                    id: doctorId,
                    name: `${doctor.firstName} ${doctor.lastName}`,
                    metrics: {
                        patients: patientsResult?.uniquePatients || 0,
                        visites: visitsResult?.totalVisits || 0,
                        revenus: revenueResult?.totalRevenue || 0,
                        tempsAttente: waitingTimeResult?.avgWaitingTime || 0,
                        ponctualite: punctualityResult?.punctualityRate || 0,
                        dureeConsult: consultDurationResult?.avgConsultDuration || 0
                    }
                };
            }));

            // Calculer les max pour normaliser les données (pour le radar chart)
            const maxValues = {
                patients: Math.max(...benchmarkData.map(d => d.metrics.patients)),
                visites: Math.max(...benchmarkData.map(d => d.metrics.visites)),
                revenus: Math.max(...benchmarkData.map(d => d.metrics.revenus)),
                tempsAttente: Math.max(...benchmarkData.map(d => d.metrics.tempsAttente)),
                ponctualite: 100, // Le taux de ponctualité est déjà en pourcentage
                dureeConsult: Math.max(...benchmarkData.map(d => d.metrics.dureeConsult))
            };

            res.json({
                doctors: benchmarkData,
                maxValues: maxValues
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des données de benchmark:', error);
            res.status(500).json({ error: 'Erreur du serveur' });
        }
    });

    return router;
};
