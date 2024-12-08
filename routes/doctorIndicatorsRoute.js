const express = require('express');
const router = express.Router();

module.exports = (connection) => {
  router.get('/:doctorId/consultations', (req, res) => {
    const doctorId = req.params.doctorId;
    const query = `
      SELECT 
        DATE_FORMAT(visit.currentLocalTimeAssignment, '%Y-%m') AS month,
        COUNT(DISTINCT visit.patient_id) AS consultation_count,
        COUNT(DISTINCT CASE WHEN visit_summary.visit_count = 1 THEN visit.patient_id END) AS new_patients,
        SUM(COUNT(DISTINCT CASE WHEN visit_summary.visit_count = 1 THEN visit.patient_id END)) OVER (ORDER BY DATE_FORMAT(visit.currentLocalTimeAssignment, '%Y-%m')) AS cumulative_new_patients,
        COUNT(DISTINCT CASE WHEN visit_summary.visit_count > 1 THEN visit.patient_id END) AS returning_patients
      FROM 
        visit
      JOIN 
        consultation ON consultation.id = visit.id
      JOIN 
        (SELECT patient_id, COUNT(id) AS visit_count FROM visit GROUP BY patient_id) AS visit_summary
        ON visit.patient_id = visit_summary.patient_id
      WHERE 
        visit.user_activated_id = ?
      GROUP BY 
        month
      ORDER BY 
        month;
    `;
    connection.query(query, [doctorId], (error, results) => {
      if (error) throw error;
      res.json(results);
    });
  });

  return router;
};
