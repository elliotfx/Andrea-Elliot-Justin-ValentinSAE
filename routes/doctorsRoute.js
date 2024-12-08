const express = require('express');
const router = express.Router();

module.exports = (connection) => {
  router.get('/', (req, res) => {
    const query = `
    SELECT id, firstName, lastName FROM user WHERE user.discr = "Doctor" and user.enabled=1;
    `;
    connection.query(query, (error, results) => {
      if (error) throw error;
      res.json(results);
    });
  });

  return router;
};
