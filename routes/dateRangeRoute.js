const express = require('express');
const router = express.Router();

module.exports = (connection) => {
    router.get('/', (req, res) => {
        const query = `
      SELECT 
        DATE(MIN(currentLocalTimeAssignment)) AS minDate,
        DATE(MAX(currentLocalTimeAssignment)) AS maxDate
      FROM visit
      WHERE currentLocalTimeAssignment IS NOT NULL;
    `;

        connection.query(query, (error, results) => {
            if (error) {
                console.error('Error fetching date range:', error);
                return res.status(500).json({ error: 'Erreur serveur' });
            }
            res.json(results[0]);
        });
    });

    return router;
};

