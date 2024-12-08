const express = require('express');
const router = express.Router();

module.exports = (connection) => {
  router.get('/', (req, res) => {
    // Récupérer les dates de début et de fin à partir des paramètres de requête
    const startDate = req.query['start-date'];
    const endDate = req.query['end-date'];
    const doctorId = req.query['doctorId']; // Récupérer l'ID du docteur optionnel

    // Si les dates ne sont pas fournies, renvoyer une erreur
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Les dates de début et de fin sont requises.' });
    }

    // Construire la requête SQL
    let query = `
      SELECT 
          DATE_FORMAT(currentLocalTimeAssignment, '%Y-%m') AS month,
          COUNT(DISTINCT visit.id) AS visit_count,
          SUM(payment.amount) AS revenue
      FROM 
          visit
      JOIN
          consultation ON visit.id = consultation.id
      JOIN 
          payment ON consultation.id = payment.consultation_id
      WHERE 
          currentLocalTimeAssignment BETWEEN ? AND ?
    `;

    // Si l'ID du docteur est fourni, ajouter une condition pour filtrer par docteur
    const queryParams = [startDate, endDate];
    if (doctorId) {
      query += ` AND visit.user_activated_id = ?`;
      queryParams.push(doctorId); // Ajouter l'ID du docteur aux paramètres de la requête
    }

    // Ajouter le groupement par mois
    query += `
      GROUP BY 
          month
      ORDER BY 
          month;
    `;

    // Exécuter la requête avec les paramètres (dates et éventuellement l'ID du docteur)
    connection.query(query, queryParams, (error, results) => {
      if (error) {
        console.error('Error executing query:', error);
        return res.status(500).json({ message: 'Erreur serveur.' });
      }
      res.json(results);
    });
  });

  return router;
};
