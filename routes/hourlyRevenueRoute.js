const express = require('express');
const router = express.Router();

module.exports = (connection) => {
  router.get('/', (req, res) => {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Les dates de début et de fin sont requises.' });
    }

    const query = `
      WITH hourly_revenue AS (
          SELECT 
              v.patient_id,
              DATE(v.currentLocalTimeAssignment) AS visit_date,
              HOUR(v.currentLocalTimeAssignment) AS visit_hour,
              SUM(p.amount) AS total_revenue
          FROM 
              visit v
          JOIN 
              consultation c ON v.id = c.id
          JOIN 
              payment p ON c.id = p.consultation_id
          WHERE 
              v.currentLocalTimeAssignment BETWEEN ? AND ?
          GROUP BY 
              visit_date, visit_hour
      )
      SELECT 
          DATE_FORMAT(hr.visit_date, '%Y-%m') AS month,
          hr.visit_hour,
          CASE
              WHEN hr.visit_hour = 0 THEN '00:00-01:00'
              WHEN hr.visit_hour = 1 THEN '01:00-02:00'
              WHEN hr.visit_hour = 2 THEN '02:00-03:00'
              WHEN hr.visit_hour = 3 THEN '03:00-04:00'
              WHEN hr.visit_hour = 4 THEN '04:00-05:00'
              WHEN hr.visit_hour = 5 THEN '05:00-06:00'
              WHEN hr.visit_hour = 6 THEN '06:00-07:00'
              WHEN hr.visit_hour = 7 THEN '07:00-08:00'
              WHEN hr.visit_hour = 8 THEN '08:00-09:00'
              WHEN hr.visit_hour = 9 THEN '09:00-10:00'
              WHEN hr.visit_hour = 10 THEN '10:00-11:00'
              WHEN hr.visit_hour = 11 THEN '11:00-12:00'
              WHEN hr.visit_hour = 12 THEN '12:00-13:00'
              WHEN hr.visit_hour = 13 THEN '13:00-14:00'
              WHEN hr.visit_hour = 14 THEN '14:00-15:00'
              WHEN hr.visit_hour = 15 THEN '15:00-16:00'
              WHEN hr.visit_hour = 16 THEN '16:00-17:00'
              WHEN hr.visit_hour = 17 THEN '17:00-18:00'
              WHEN hr.visit_hour = 18 THEN '18:00-19:00'
              WHEN hr.visit_hour = 19 THEN '19:00-20:00'
              WHEN hr.visit_hour = 20 THEN '20:00-21:00'
              WHEN hr.visit_hour = 21 THEN '21:00-22:00'
              WHEN hr.visit_hour = 22 THEN '22:00-23:00'
              WHEN hr.visit_hour = 23 THEN '23:00-00:00'
          END AS hour_range,
          SUM(hr.total_revenue) AS total_revenue
      FROM 
          hourly_revenue hr
      GROUP BY 
          month, hr.visit_hour
      ORDER BY 
          month, hr.visit_hour;
    `;

    // Ajout de console.log pour vérifier les résultats
    connection.query(query, [start, end], (error, results) => {
      if (error) {
        return res.status(500).json({ error: 'Erreur lors de la récupération des données' });
      }

      // Journaliser les résultats pour inspection
      console.log("Résultats API:", results);
      
      res.json(results);
    });
  });

  return router;
};
