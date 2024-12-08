const express = require('express');
const router = express.Router();

module.exports = (connection) => {
  router.get('/', async (req, res) => {
    const startDate = req.query['start-date'];
    const endDate = req.query['end-date'];

    // Validation des dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Les dates de début et de fin sont requises.' });
    }

    try {
      // Requête : Temps d'attente moyen pour toute la clinique par mois
      const avgWaitingTimeByMonth = new Promise((resolve, reject) => {
        const query = `
          SELECT 
              DATE_FORMAT(v.arrivalDate, '%Y-%m') AS month,
              ROUND(AVG(TIMESTAMPDIFF(MINUTE, v.arrivalDate, v.startDate))) AS avg_waiting_time
          FROM visit v
          WHERE v.arrivalDate IS NOT NULL
          AND v.startDate IS NOT NULL
          AND v.currentLocalTimeAssignment BETWEEN ? AND ?
          GROUP BY DATE_FORMAT(v.arrivalDate, '%Y-%m')
          ORDER BY month;
        `;
        connection.query(query, [startDate, endDate], (error, results) => {
          if (error) return reject(error);
          resolve(results);
        });
      });

      // Requête : Temps d'attente moyen par médecin
      const avgWaitingTimeByDoctor = new Promise((resolve, reject) => {
        const query = `
          SELECT 
              u.id AS doctor_id,
              CONCAT(u.firstName, ' ', u.lastName) AS doctor_name,
              ROUND(AVG(TIMESTAMPDIFF(MINUTE, v.arrivalDate, v.startDate))) AS avg_waiting_time_per_doctor
          FROM visit v
          JOIN user u ON v.user_activated_id = u.id
          WHERE v.arrivalDate IS NOT NULL
          AND v.startDate IS NOT NULL
          AND v.currentLocalTimeAssignment BETWEEN ? AND ?
          GROUP BY u.id
          ORDER BY avg_waiting_time_per_doctor DESC;
        `;
        connection.query(query, [startDate, endDate], (error, results) => {
          if (error) return reject(error);
          resolve(results);
        });
      });

      // Exécution des requêtes en parallèle
      const results = await Promise.all([
        avgWaitingTimeByMonth,
        avgWaitingTimeByDoctor
      ]);

      // Envoi des résultats en réponse
      res.json({
        avg_waiting_time_by_month: results[0],  // Temps d'attente moyen par mois
        avg_waiting_time_by_doctor: results[1]  // Temps d'attente moyen par médecin
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des temps d\'attente:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  return router;
};
