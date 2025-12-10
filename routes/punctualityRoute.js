const express = require('express');
const router = express.Router();

module.exports = (connection) => {
    router.get('/', async (req, res) => {
        const startDate = req.query['start-date'];
        const endDate = req.query['end-date'];
        const doctorId = req.query['doctor-id'];

        // Validation des dates
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Les dates de début et de fin sont requises.' });
        }

        try {
            // Requête : Taux de ponctualité global par mois
            const punctualityByMonth = new Promise((resolve, reject) => {
                const query = `
          SELECT 
              DATE_FORMAT(v.currentLocalTimeAssignment, '%Y-%m') AS month,
              COUNT(*) AS total_appointments,
              SUM(
                  CASE 
                      WHEN DATE_FORMAT(v.currentLocalTimeAssignment, '%Y-%m-%d %H:%i') = DATE_FORMAT(v.startDate, '%Y-%m-%d %H:%i') 
                      THEN 1 
                      ELSE 0 
                  END
              ) AS on_time_appointments,
              SUM(
                  CASE 
                      WHEN v.startDate > v.currentLocalTimeAssignment 
                      THEN 1 
                      ELSE 0 
                  END
              ) AS late_appointments,
              ROUND(
                  AVG(
                      CASE 
                          WHEN v.startDate > v.currentLocalTimeAssignment 
                          THEN TIMESTAMPDIFF(MINUTE, v.currentLocalTimeAssignment, v.startDate) 
                          ELSE 0 
                      END
                  )
              ) AS avg_delay_minutes,
              ROUND(
                  (SUM(
                      CASE 
                          WHEN DATE_FORMAT(v.currentLocalTimeAssignment, '%Y-%m-%d %H:%i') = DATE_FORMAT(v.startDate, '%Y-%m-%d %H:%i') 
                          THEN 1 
                          ELSE 0 
                      END
                  ) / COUNT(*)) * 100, 
                  2
              ) AS punctuality_rate
          FROM visit v
          WHERE v.currentLocalTimeAssignment IS NOT NULL
          AND v.startDate IS NOT NULL
          AND v.currentLocalTimeAssignment BETWEEN ? AND ?
          ${doctorId ? 'AND v.user_activated_id = ?' : ''}
          GROUP BY DATE_FORMAT(v.currentLocalTimeAssignment, '%Y-%m')
          ORDER BY month;
        `;
                const params = doctorId ? [startDate, endDate, doctorId] : [startDate, endDate];
                connection.query(query, params, (error, results) => {
                    if (error) return reject(error);
                    resolve(results);
                });
            });

            // Requête : Ponctualité par médecin
            const punctualityByDoctor = new Promise((resolve, reject) => {
                const query = `
          SELECT 
              u.id AS doctor_id,
              CONCAT(u.firstName, ' ', u.lastName) AS doctor_name,
              COUNT(*) AS total_appointments,
              SUM(
                  CASE 
                      WHEN DATE_FORMAT(v.currentLocalTimeAssignment, '%Y-%m-%d %H:%i') = DATE_FORMAT(v.startDate, '%Y-%m-%d %H:%i') 
                      THEN 1 
                      ELSE 0 
                  END
              ) AS on_time_appointments,
              SUM(
                  CASE 
                      WHEN v.startDate > v.currentLocalTimeAssignment 
                      THEN 1 
                      ELSE 0 
                  END
              ) AS late_appointments,
              ROUND(
                  AVG(
                      CASE 
                          WHEN v.startDate > v.currentLocalTimeAssignment 
                          THEN TIMESTAMPDIFF(MINUTE, v.currentLocalTimeAssignment, v.startDate) 
                          ELSE 0 
                      END
                  )
              ) AS avg_delay_minutes,
              ROUND(
                  (SUM(
                      CASE 
                          WHEN DATE_FORMAT(v.currentLocalTimeAssignment, '%Y-%m-%d %H:%i') = DATE_FORMAT(v.startDate, '%Y-%m-%d %H:%i') 
                          THEN 1 
                          ELSE 0 
                      END
                  ) / COUNT(*)) * 100, 
                  2
              ) AS punctuality_rate
          FROM visit v
          JOIN user u ON v.user_activated_id = u.id
          WHERE v.currentLocalTimeAssignment IS NOT NULL
          AND v.startDate IS NOT NULL
          AND v.currentLocalTimeAssignment BETWEEN ? AND ?
          ${doctorId ? 'AND v.user_activated_id = ?' : ''}
          GROUP BY u.id
          ORDER BY punctuality_rate DESC;
        `;
                const params = doctorId ? [startDate, endDate, doctorId] : [startDate, endDate];
                connection.query(query, params, (error, results) => {
                    if (error) return reject(error);
                    resolve(results);
                });
            });

            // Requête : Statistiques globales
            const overallStats = new Promise((resolve, reject) => {
                const query = `
          SELECT 
              COUNT(*) AS total_appointments,
              SUM(
                  CASE 
                      WHEN DATE_FORMAT(v.currentLocalTimeAssignment, '%Y-%m-%d %H:%i') = DATE_FORMAT(v.startDate, '%Y-%m-%d %H:%i') 
                      THEN 1 
                      ELSE 0 
                  END
              ) AS on_time_appointments,
              SUM(
                  CASE 
                      WHEN v.startDate > v.currentLocalTimeAssignment 
                      THEN 1 
                      ELSE 0 
                  END
              ) AS late_appointments,
              ROUND(
                  AVG(
                      CASE 
                          WHEN v.startDate > v.currentLocalTimeAssignment 
                          THEN TIMESTAMPDIFF(MINUTE, v.currentLocalTimeAssignment, v.startDate) 
                          ELSE 0 
                      END
                  )
              ) AS avg_delay_minutes,
              ROUND(
                  (SUM(
                      CASE 
                          WHEN DATE_FORMAT(v.currentLocalTimeAssignment, '%Y-%m-%d %H:%i') = DATE_FORMAT(v.startDate, '%Y-%m-%d %H:%i') 
                          THEN 1 
                          ELSE 0 
                      END
                  ) / COUNT(*)) * 100, 
                  2
              ) AS punctuality_rate
          FROM visit v
          WHERE v.currentLocalTimeAssignment IS NOT NULL
          AND v.startDate IS NOT NULL
          AND v.currentLocalTimeAssignment BETWEEN ? AND ?
          ${doctorId ? 'AND v.user_activated_id = ?' : ''};
        `;
                const params = doctorId ? [startDate, endDate, doctorId] : [startDate, endDate];
                connection.query(query, params, (error, results) => {
                    if (error) return reject(error);
                    resolve(results[0]);
                });
            });

            // Exécution des requêtes en parallèle
            const results = await Promise.all([
                punctualityByMonth,
                punctualityByDoctor,
                overallStats
            ]);

            // Envoi des résultats en réponse
            res.json({
                punctuality_by_month: results[0],
                punctuality_by_doctor: results[1],
                overall_stats: results[2]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques de ponctualité:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    });

    return router;
};
