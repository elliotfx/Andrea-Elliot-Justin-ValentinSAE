const express = require('express');
const router = express.Router();

module.exports = (connection) => {
  router.get('/', (req, res) => {
    const { start, end } = req.query; // Get the start and end date from query parameters

    // Validate that start and end dates are provided
    if (!start || !end) {
      res.status(400).json({ error: 'Start date and end date are required' });
      return;
    }

    const query = `
      WITH initial_visits AS (
        SELECT 
            v.patient_id,
            DATE_FORMAT(v.currentLocalTimeAssignment, '%Y-%m') AS visit_month,
            CASE
                WHEN HOUR(v.currentLocalTimeAssignment) = 0 THEN '00:00-01:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 1 THEN '01:00-02:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 2 THEN '02:00-03:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 3 THEN '03:00-04:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 4 THEN '04:00-05:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 5 THEN '05:00-06:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 6 THEN '06:00-07:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 7 THEN '07:00-08:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 8 THEN '08:00-09:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 9 THEN '09:00-10:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 10 THEN '10:00-11:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 11 THEN '11:00-12:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 12 THEN '12:00-13:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 13 THEN '13:00-14:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 14 THEN '14:00-15:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 15 THEN '15:00-16:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 16 THEN '16:00-17:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 17 THEN '17:00-18:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 18 THEN '18:00-19:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 19 THEN '19:00-20:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 20 THEN '20:00-21:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 21 THEN '21:00-22:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 22 THEN '22:00-23:00'
                WHEN HOUR(v.currentLocalTimeAssignment) = 23 THEN '23:00-00:00'
            END AS hour_range
        FROM 
            visit v
        WHERE 
            v.currentLocalTimeAssignment BETWEEN ? AND ? -- Filter by start and end dates
      ),
      subsequent_visits AS (
        SELECT 
            iv.patient_id,
            iv.visit_month,
            iv.hour_range,
            COUNT(v.id) AS subsequent_visit_count
        FROM 
            initial_visits iv
        JOIN 
            visit v ON iv.patient_id = v.patient_id 
        WHERE 
            v.currentLocalTimeAssignment > (SELECT MIN(currentLocalTimeAssignment) FROM visit WHERE patient_id = iv.patient_id AND DATE_FORMAT(currentLocalTimeAssignment, '%Y-%m') = iv.visit_month AND HOUR(currentLocalTimeAssignment) = HOUR(STR_TO_DATE(iv.hour_range, '%H:%i-%H:%i')))
        GROUP BY 
            iv.patient_id, iv.visit_month, iv.hour_range
      )
      SELECT 
          iv.visit_month AS month,
          iv.hour_range,
          COUNT(DISTINCT iv.patient_id) AS unique_patients,
          COALESCE(SUM(sv.subsequent_visit_count), 0) AS total_subsequent_visits
      FROM 
          initial_visits iv
      LEFT JOIN 
          subsequent_visits sv ON iv.patient_id = sv.patient_id AND iv.visit_month = sv.visit_month AND iv.hour_range = sv.hour_range
      GROUP BY 
          iv.visit_month, iv.hour_range
      ORDER BY 
          iv.visit_month, HOUR(STR_TO_DATE(iv.hour_range, '%H:%i-%H:%i'));
    `;

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
