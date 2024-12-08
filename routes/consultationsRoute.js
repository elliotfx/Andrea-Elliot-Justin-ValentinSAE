const express = require('express');
const router = express.Router();

module.exports = (connection) => {
  router.get('/', (req, res) => {
    const month = req.query.month || '';
    let query = `
      SELECT 
          user.firstName AS doctor_first_name,
          user.lastName AS doctor_last_name,
          COUNT(consultation.id) AS consultation_count
      FROM 
          consultation
      JOIN 
          visit ON consultation.id = visit.id
      JOIN 
          user ON visit.user_activated_id = user.id
      WHERE 
          1 = 1
    `;

    if (month) {
      query += ` AND DATE_FORMAT(visit.currentLocalTimeAssignment, '%Y-%m') = '${month}' `;
    }

    query += `GROUP BY user.id ORDER BY consultation_count DESC;`;

    connection.query(query, (error, results) => {
      if (error) throw error;
      res.json(results);
    });
  });

  return router;
};
