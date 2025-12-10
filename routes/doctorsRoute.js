const express = require('express');
const router = express.Router();

module.exports = (connection) => {
  router.get('/', (req, res) => {
    const query = `
    SELECT id, firstName, lastName 
    FROM user 
    WHERE user.discr = "Doctor" 
    AND user.enabled=1
    AND user.firstName NOT IN ('User', 'Technologie', 'ADMIN')
    AND user.lastName NOT IN ('RADIO', 'KBM', 'ADMIN');
    `;
    connection.query(query, (error, results) => {
      if (error) throw error;
      res.json(results);
    });
  });

  return router;
};
