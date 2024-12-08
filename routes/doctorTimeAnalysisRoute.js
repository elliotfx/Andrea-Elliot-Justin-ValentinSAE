const express = require('express');
const router = express.Router();

module.exports = (connection) => {
    // Convertir connection.query en fonction basée sur une promesse avec journalisation
    const query = (sql, params) => new Promise((resolve, reject) => {
        console.log('Exécution de la requête SQL :', sql);  
        console.log('Avec les paramètres :', params);

        connection.query(sql, params, (err, results) => {
            if (err) {
                console.error('Erreur lors de l\'exécution de la requête :', err);  
                return reject(err);
            }
            resolve(results);  
        });
    });

    // Route pour récupérer les données d'analyse du temps pour un médecin donné
    // Ajout du middleware d'authentification ici
    router.get('/', async (req, res) => {
        const { doctorId, startDate, endDate } = req.query;

        // Requête SQL pour analyser le temps d'attente et le temps patient par semaine
        const queryStr = `
            SELECT 
                YEAR(v.currentLocalTimeAssignment) AS year,
                WEEK(v.currentLocalTimeAssignment, 1) AS week_number,
                AVG(TIMESTAMPDIFF(MINUTE, v.arrivalDate, v.startDate)) AS avg_waiting_time_minutes,
                AVG(TIMESTAMPDIFF(MINUTE, v.startDate, v.endDate)) AS avg_patient_time_minutes
            FROM 
                visit v
            WHERE 
                v.user_activated_id = ?
                AND v.currentLocalTimeAssignment BETWEEN ? AND ?
            GROUP BY 
                YEAR(v.currentLocalTimeAssignment), WEEK(v.currentLocalTimeAssignment, 1)
            ORDER BY 
                YEAR(v.currentLocalTimeAssignment), WEEK(v.currentLocalTimeAssignment, 1);
        `;

        try {
            // Utilisation de la méthode query basée sur des promesses
            const result = await query(queryStr, [doctorId, startDate, endDate]);
            res.json(result);
        } catch (error) {
            console.error('Erreur lors de la récupération des données hebdomadaires :', error);
            res.status(500).json({ error: 'Erreur lors de la récupération des données' });
        }
    });

    return router;
};
