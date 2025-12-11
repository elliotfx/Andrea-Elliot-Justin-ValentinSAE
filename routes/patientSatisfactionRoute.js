const mysql = require('mysql2/promise');
const express = require('express');
const router = express.Router();

// Configuration de la connexion
const pool = mysql.createPool({
    host: 'db',
    user: 'root',
    password: 'yourpassword',
    database: 'kbmdocv2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Route pour obtenir les raisons des visites (expérience patient)
router.get('/patient-reasons', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Récupérer les raisons des visites et compter les occurrences
        const [data] = await conn.query(`
            SELECT 
                v.reason as reason,
                COUNT(*) as count,
                ROUND(AVG(TIMESTAMPDIFF(MINUTE, v.arrivalDate, v.startDate)), 1) as avg_waiting_time
            FROM visit v
            WHERE v.reason IS NOT NULL 
            AND v.reason != ''
            AND v.arrivalDate IS NOT NULL 
            AND v.startDate IS NOT NULL
            GROUP BY v.reason
            ORDER BY count DESC
            LIMIT 15
        `);

        res.json({ reasons: data });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (conn) conn.release();
    }
});

// Route pour obtenir les raisons par mois
router.get('/patient-reasons-monthly', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // Récupérer les raisons par mois
        const [data] = await conn.query(`
            SELECT 
                DATE_FORMAT(v.arrivalDate, '%Y-%m') as month,
                v.reason as reason,
                COUNT(*) as count
            FROM visit v
            WHERE v.reason IS NOT NULL 
            AND v.reason != ''
            AND v.arrivalDate IS NOT NULL
            AND v.arrivalDate >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
            GROUP BY month, reason
            ORDER BY month DESC, count DESC
        `);

        res.json({ monthly_reasons: data });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: error.message });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;
