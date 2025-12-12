module.exports = (connection) => {
  const express = require('express');
  const router = express.Router();

  // Route pour obtenir la distribution des patients par ville
  router.get('/', (req, res) => {
    const query = `
      SELECT 
        TRIM(address) as city,
        COUNT(*) as count
      FROM patient
      WHERE address IS NOT NULL 
        AND address != ''
        AND TRIM(address) != ''
      GROUP BY city
      HAVING count > 0
      ORDER BY count DESC
    `;

    connection.query(query, (error, results) => {
      if (error) {
        console.error('Erreur lors de la récupération de la distribution par ville:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      res.json(results);
    });
  });

  return router;
};
