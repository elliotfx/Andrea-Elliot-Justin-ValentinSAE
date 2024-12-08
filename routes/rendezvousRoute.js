const express = require('express');
const router = express.Router();

module.exports = (connection) => {
  router.get('/', async (req, res) => {
    const startDate = req.query['start'];
    const endDate = req.query['end'];

    // Validation des dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Les dates de début et de fin sont requises.' });
    }

    try {
      // Requête pour obtenir les rendez-vous du même mois et ceux du mois suivant
      const rendezvousByMonth = new Promise((resolve, reject) => {
        const query = `
        
          SELECT
    DATE_FORMAT(pse.dateTaking, '%Y-%m') AS mois_prise,
    COUNT(*) AS total_rendezvous_pris,
    SUM(
        CASE
            WHEN DATE_FORMAT(pse.dateTaking, '%Y-%m') = DATE_FORMAT(e.startDatetime, '%Y-%m') THEN 1
            ELSE 0
        END
    ) AS rendezvous_meme_mois,
    SUM(
        CASE
            WHEN DATE_FORMAT(e.startDatetime, '%Y-%m') > DATE_FORMAT(pse.dateTaking, '%Y-%m') THEN 1
            ELSE 0
        END
    ) AS rendezvous_mois_suivants
FROM evenement AS e
JOIN patient_service_event AS pse ON e.id = pse.id
WHERE
    pse.dateTaking BETWEEN ? AND ?
GROUP BY
    mois_prise
ORDER BY
    mois_prise;
        `;
        connection.query(query, [startDate, endDate], (error, results) => {
          if (error) return reject(error);
          resolve(results);
        });
      });

      // Exécution de la requête
      const results = await rendezvousByMonth;

      // Envoi des résultats en réponse
      res.json({
        rendezvous_by_month: results  // Rendez-vous par mois (même mois et mois suivant)
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des rendez-vous:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  return router;
};
