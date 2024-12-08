const express = require('express');
const router = express.Router();

module.exports = (connection) => {
  router.get('/comparison', (req, res) => {
    const query = `
      SELECT 
        user.id AS doctor_id,
        CONCAT(user.firstName, ' ', user.lastName) AS doctor_name,
        COUNT(DISTINCT visit.id) AS total_consultations,
        COUNT(DISTINCT CASE WHEN visit_summary.visit_count = 1 THEN visit.patient_id END) AS new_patients,
        COUNT(DISTINCT CASE WHEN visit_summary.visit_count > 1 THEN visit.patient_id END) AS returning_patients
      FROM 
        user
      JOIN 
        visit ON visit.user_activated_id = user.id
      JOIN 
        (SELECT patient_id, COUNT(id) AS visit_count FROM visit GROUP BY patient_id) AS visit_summary
        ON visit.patient_id = visit_summary.patient_id
      GROUP BY 
        user.id
      ORDER BY 
        doctor_name;
    `;
    connection.query(query, (error, results) => {
      if (error) throw error;
      res.json(results);
    });
  });

  return router;
};
