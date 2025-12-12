module.exports = (connection) => {
  const express = require('express');
  const router = express.Router();

  // Route pour obtenir la répartition par genre
  router.get('/gender', (req, res) => {
    const query = `
      SELECT 
        gender,
        COUNT(*) as count
      FROM patient
      WHERE gender IS NOT NULL
      GROUP BY gender
      ORDER BY count DESC
    `;
    
    connection.query(query, (error, results) => {
      if (error) {
        console.error('Erreur lors de la récupération des données par genre:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      res.json(results);
    });
  });

  // Route pour obtenir la répartition par tranche d'âge
  router.get('/age-groups', (req, res) => {
    const query = `
      SELECT 
        CASE 
          WHEN TIMESTAMPDIFF(YEAR, birthDate, CURDATE()) < 18 THEN '0-17 ans'
          WHEN TIMESTAMPDIFF(YEAR, birthDate, CURDATE()) BETWEEN 18 AND 30 THEN '18-30 ans'
          WHEN TIMESTAMPDIFF(YEAR, birthDate, CURDATE()) BETWEEN 31 AND 45 THEN '31-45 ans'
          WHEN TIMESTAMPDIFF(YEAR, birthDate, CURDATE()) BETWEEN 46 AND 60 THEN '46-60 ans'
          WHEN TIMESTAMPDIFF(YEAR, birthDate, CURDATE()) BETWEEN 61 AND 75 THEN '61-75 ans'
          ELSE '76+ ans'
        END as age_group,
        COUNT(*) as count
      FROM patient
      WHERE birthDate IS NOT NULL
        AND YEAR(birthDate) > 1930
      GROUP BY age_group
      ORDER BY 
        CASE 
          WHEN age_group = '0-17 ans' THEN 1
          WHEN age_group = '18-30 ans' THEN 2
          WHEN age_group = '31-45 ans' THEN 3
          WHEN age_group = '46-60 ans' THEN 4
          WHEN age_group = '61-75 ans' THEN 5
          ELSE 6
        END
    `;
    
    connection.query(query, (error, results) => {
      if (error) {
        console.error('Erreur lors de la récupération des données par tranche d\'âge:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      res.json(results);
    });
  });

  return router;
};
