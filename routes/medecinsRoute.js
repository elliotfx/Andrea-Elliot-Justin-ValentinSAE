const express = require('express');
const router = express.Router();

module.exports = (connection) => {
    router.get('/', (req, res) => {
        const startDate = req.query['startDate'];
        const endDate = req.query['endDate'];

        // Vérification de la validité des paramètres de date
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Les paramètres startDate et endDate sont requis.' });
        }

        const query = `
            WITH hours_per_user AS (
                -- Calcule le nombre total d'heures travaillées pour chaque médecin dans la période donnée
                SELECT 
                    visit.user_activated_id,
                    SUM(TIMESTAMPDIFF(HOUR, visit.startdate, visit.enddate)) AS total_hours_worked
                FROM 
                    visit
                WHERE 
                    visit.startdate IS NOT NULL 
                    AND visit.enddate IS NOT NULL
                    AND visit.startdate BETWEEN ? AND ?  -- Filtrage par période
                GROUP BY 
                    visit.user_activated_id
            ),
            payments_per_user AS (
                -- Calcule le montant total généré et le nombre de consultations par médecin dans la période donnée
                SELECT 
                    visit.user_activated_id,
                    SUM(payment.amount) AS total_payments,
                    COUNT(DISTINCT visit.id) AS total_consultations
                FROM 
                    payment
                JOIN 
                    consultation ON payment.consultation_id = consultation.id
                JOIN 
                    visit ON consultation.id = visit.id
                WHERE 
                    visit.startdate BETWEEN ? AND ?  -- Filtrage par période
                GROUP BY 
                    visit.user_activated_id
            )
            SELECT 
                user.lastName,
                user.firstName,
                payments_per_user.total_payments AS Montant,  -- Montant total généré par médecin
                payments_per_user.total_consultations AS Consultations,  -- Nombre total de consultations
                ROUND(payments_per_user.total_payments / NULLIF(payments_per_user.total_consultations, 0), 2) AS cout_par_consultation,  -- Coût par consultation
                COALESCE(hours_per_user.total_hours_worked, 0) AS total_hours,
                ROUND(payments_per_user.total_payments / NULLIF(hours_per_user.total_hours_worked, 0), 2) AS tarif_par_heure  
            FROM 
                user
            LEFT JOIN 
                payments_per_user ON user.id = payments_per_user.user_activated_id
            LEFT JOIN 
                hours_per_user ON user.id = hours_per_user.user_activated_id
            WHERE 
                enabled=1
                and payments_per_user.total_payments IS NOT NULL 
                AND payments_per_user.total_payments > 0  -- Exclure les médecins avec montant nul ou zéro
            ORDER BY 
                Montant DESC;
        `;

        // Exécution de la requête avec les dates en tant que paramètres
        connection.query(query, [startDate, endDate, startDate, endDate], (error, results) => {
            if (error) {
                res.status(500).json({ error: 'Erreur lors de la récupération des données' });
            } else {
                res.json(results);
            }
        });
    });

    return router;
};
