const express = require('express');
const router = express.Router();

module.exports = (connection) => {
  router.get('/', (req, res) => {
    const { start, end } = req.query; // Récupérer les dates de début et de fin

    // Validation des dates
    if (!start || !end) {
      res.status(400).json({ error: 'Start date and end date are required' });
      return;
    }

    // Requête SQL pour analyser le temps d'attente moyen par plage horaire et par mois
    const query = `
      WITH hourly_wait_times AS (
        SELECT 
            DATE_FORMAT(v.arrivalDate, '%Y-%m') AS visit_month,
            CASE
                WHEN HOUR(v.arrivalDate) = 0 THEN '00:00-01:00'
                WHEN HOUR(v.arrivalDate) = 1 THEN '01:00-02:00'
                WHEN HOUR(v.arrivalDate) = 2 THEN '02:00-03:00'
                WHEN HOUR(v.arrivalDate) = 3 THEN '03:00-04:00'
                WHEN HOUR(v.arrivalDate) = 4 THEN '04:00-05:00'
                WHEN HOUR(v.arrivalDate) = 5 THEN '05:00-06:00'
                WHEN HOUR(v.arrivalDate) = 6 THEN '06:00-07:00'
                WHEN HOUR(v.arrivalDate) = 7 THEN '07:00-08:00'
                WHEN HOUR(v.arrivalDate) = 8 THEN '08:00-09:00'
                WHEN HOUR(v.arrivalDate) = 9 THEN '09:00-10:00'
                WHEN HOUR(v.arrivalDate) = 10 THEN '10:00-11:00'
                WHEN HOUR(v.arrivalDate) = 11 THEN '11:00-12:00'
                WHEN HOUR(v.arrivalDate) = 12 THEN '12:00-13:00'
                WHEN HOUR(v.arrivalDate) = 13 THEN '13:00-14:00'
                WHEN HOUR(v.arrivalDate) = 14 THEN '14:00-15:00'
                WHEN HOUR(v.arrivalDate) = 15 THEN '15:00-16:00'
                WHEN HOUR(v.arrivalDate) = 16 THEN '16:00-17:00'
                WHEN HOUR(v.arrivalDate) = 17 THEN '17:00-18:00'
                WHEN HOUR(v.arrivalDate) = 18 THEN '18:00-19:00'
                WHEN HOUR(v.arrivalDate) = 19 THEN '19:00-20:00'
                WHEN HOUR(v.arrivalDate) = 20 THEN '20:00-21:00'
                WHEN HOUR(v.arrivalDate) = 21 THEN '21:00-22:00'
                WHEN HOUR(v.arrivalDate) = 22 THEN '22:00-23:00'
                WHEN HOUR(v.arrivalDate) = 23 THEN '23:00-00:00'
            END AS hour_range,
            AVG(TIMESTAMPDIFF(MINUTE, v.arrivalDate, v.startDate)) AS avg_waiting_time
        FROM 
            visit v
        WHERE 
            v.arrivalDate BETWEEN ? AND ? -- Filtre par les dates de début et de fin
            AND v.arrivalDate IS NOT NULL 
            AND v.startDate IS NOT NULL
        GROUP BY 
            visit_month, hour_range
      )
      SELECT 
          visit_month AS month,
          hour_range,
          ROUND(avg_waiting_time, 2) AS avg_waiting_time
      FROM 
          hourly_wait_times
      ORDER BY 
          visit_month, STR_TO_DATE(hour_range, '%H:%i-%H:%i');
    `;

    // Exécuter la requête
    connection.query(query, [start, end], (error, results) => {
      if (error) {
        console.error('Error executing the query:', error);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
      res.json(results);
    });
  });

  return router;
};
