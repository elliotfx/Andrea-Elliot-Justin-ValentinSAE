const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // Route pour récupérer les actes dentaires en fonction d'un intervalle de dates
  router.get('/', (req, res) => {  
    const { start, end } = req.query;  // Récupérer les dates de début et de fin des paramètres de requête

    // Validation des dates
    if (!start || !end) {
      return res.status(400).json({ error: 'Les dates de début et de fin sont requises.' });
    }

    // Requête SQL pour récupérer les données des actes dentaires avec un intervalle de dates
    const query = `
   WITH actes_par_visit AS (
    SELECT 
        v.id AS visit_id,
        u.description1 AS acte
    FROM dental_diagram_udc ddu
    JOIN dental_diagram dd ON dd.id = ddu.dental_diagram_id
    JOIN udc u ON u.id = ddu.udc_id
    JOIN visit v ON v.id = dd.consultation_id
    WHERE v.currentLocalTimeAssignment BETWEEN ? AND ?
),
nombre_actes_par_visit AS (
    SELECT 
        visit_id,
        COUNT(*) AS nb_actes
    FROM actes_par_visit
    GROUP BY visit_id
),
revenus_par_acte AS (
    SELECT 
        apv.acte,
        SUM(p.amount / napv.nb_actes) AS totalRevenue
    FROM actes_par_visit apv
    JOIN nombre_actes_par_visit napv ON apv.visit_id = napv.visit_id
    JOIN payment p ON p.consultation_id = apv.visit_id
    GROUP BY apv.acte
),
statistiques_actes AS (
    SELECT 
        apv.acte,
        COUNT(DISTINCT v.id) AS total_visits,  -- Comptage unique des visites
        COUNT(DISTINCT v.patient_id) AS unique_patients,
        SUM(DISTINCT TIMESTAMPDIFF(MINUTE, v.startdate, v.enddate)) / 60 AS total_hours -- Heures uniques par visite
    FROM actes_par_visit apv
    JOIN visit v ON v.id = apv.visit_id
    GROUP BY apv.acte
)
SELECT 
    sa.acte,
    sa.total_visits,
    sa.unique_patients AS uniq_patients,
    ROUND(sa.total_hours, 2) AS total_hours,
    COALESCE(rpa.totalRevenue, 0) AS CA,
    ROUND(COALESCE(rpa.totalRevenue, 0) / NULLIF(sa.total_hours, 0), 2) AS avg_cost_per_hour
FROM statistiques_actes sa
LEFT JOIN revenus_par_acte rpa ON sa.acte = rpa.acte
ORDER BY CA DESC;

    `;

    // Exécution de la requête avec les dates start et end
    db.query(query, [start, end,start, end], (err, results) => {
      if (err) {
        console.error('Erreur lors de l\'exécution de la requête:', err);
        return res.status(500).send('Erreur du serveur');
      }
      // Retourner les résultats sous forme de JSON
      res.json(results);
    });
  });

  return router;
};
