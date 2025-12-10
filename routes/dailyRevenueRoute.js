const express = require('express');
const router = express.Router();

module.exports = (db) => {
    router.get('/', (req, res) => {
        const { startDate, endDate } = req.query;
        
        console.log('Route daily-revenue appelée avec:', { startDate, endDate });

        let query = `
            SELECT 
                DAYOFWEEK(visit.currentLocalTimeAssignment) AS day_number,
                CASE DAYOFWEEK(visit.currentLocalTimeAssignment)
                    WHEN 1 THEN 'Dimanche'
                    WHEN 2 THEN 'Lundi'
                    WHEN 3 THEN 'Mardi'
                    WHEN 4 THEN 'Mercredi'
                    WHEN 5 THEN 'Jeudi'
                    WHEN 6 THEN 'Vendredi'
                    WHEN 7 THEN 'Samedi'
                END AS day_name,
                COUNT(DISTINCT visit.id) AS total_visits,
                ROUND(COALESCE(SUM(payment.amount), 0), 2) AS total_revenue,
                ROUND(COALESCE(AVG(payment.amount), 0), 2) AS avg_revenue_per_visit
            FROM visit
            JOIN consultation ON visit.id = consultation.id
            JOIN payment ON consultation.id = payment.consultation_id
            WHERE 1=1
        `;

        const params = [];

        if (startDate) {
            query += ' AND visit.currentLocalTimeAssignment >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND visit.currentLocalTimeAssignment <= ?';
            params.push(endDate);
        }

        query += `
            GROUP BY day_number, day_name
            ORDER BY day_number
        `;

        db.query(query, params, (err, results) => {
            if (err) {
                console.error('Erreur lors de la récupération des revenus par jour:', err);
                return res.status(500).json({ error: 'Erreur serveur' });
            }
            console.log('Résultats daily-revenue:', results);
            res.json(results);
        });
    });

    return router;
};

