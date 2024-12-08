const express = require('express');
const router = express.Router();

module.exports = (connection) => {
  router.get('/', (req, res) => {
    // Récupérer les dates de début et de fin à partir des paramètres de la requête
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Les paramètres "startDate" et "endDate" sont requis.' });
    }

    const query = `
    WITH new_patients AS (
        SELECT 
            patient_id,
            MIN(currentLocalTimeAssignment) AS first_visit_date
        FROM 
            visit
        GROUP BY 
            patient_id
    ),
    patient_visit_counts AS (
        SELECT
            patient_id,
            COUNT(*) AS visit_count,
            MIN(currentLocalTimeAssignment) AS first_visit_date
        FROM
            visit
        GROUP BY
            patient_id
    ),
    patients_never_returned AS (
        SELECT
            patient_id,
            first_visit_date
        FROM
            patient_visit_counts
        WHERE
            visit_count = 1
    ),
    monthly_patients_never_returned AS (
        SELECT
            DATE_FORMAT(first_visit_date, '%Y-%m') AS month,
            COUNT(patient_id) AS never_returned_patient_count
        FROM
            patients_never_returned
        WHERE
            first_visit_date BETWEEN ? AND ?
        GROUP BY
            DATE_FORMAT(first_visit_date, '%Y-%m')
    ),
    monthly_new_patients AS (
        SELECT 
            DATE_FORMAT(first_visit_date, '%Y-%m') AS month,
            COUNT(patient_id) AS new_patient_count
        FROM 
            new_patients
        WHERE 
            first_visit_date BETWEEN ? AND ?
        GROUP BY 
            DATE_FORMAT(first_visit_date, '%Y-%m')
    ),
    patient_second_visits AS (
        SELECT 
            v.patient_id,
            MIN(v.currentLocalTimeAssignment) AS second_visit_date
        FROM 
            visit v
        INNER JOIN 
            new_patients np ON v.patient_id = np.patient_id
        WHERE 
            v.currentLocalTimeAssignment > np.first_visit_date
        GROUP BY 
            v.patient_id
    ),
    monthly_retained_patients AS (
        SELECT 
            DATE_FORMAT(second_visit_date, '%Y-%m') AS month,
            COUNT(patient_id) AS retained_patient_count
        FROM 
            patient_second_visits
        WHERE 
            second_visit_date BETWEEN ? AND ?
        GROUP BY 
            DATE_FORMAT(second_visit_date, '%Y-%m')
    ),
    all_months AS (
        SELECT month FROM monthly_new_patients
        UNION
        SELECT month FROM monthly_retained_patients
        UNION
        SELECT month FROM monthly_patients_never_returned
    ),
    combined_data AS (
        SELECT
            am.month,
            COALESCE(mn.new_patient_count, 0) AS new_patient_count,
            COALESCE(mr.retained_patient_count, 0) AS retained_patient_count,
            COALESCE(mnr.never_returned_patient_count, 0) AS never_returned_patient_count
        FROM
            all_months am
        LEFT JOIN
            monthly_new_patients mn ON am.month = mn.month
        LEFT JOIN
            monthly_retained_patients mr ON am.month = mr.month
        LEFT JOIN
            monthly_patients_never_returned mnr ON am.month = mnr.month
    )
    SELECT 
        month,
        new_patient_count,
        retained_patient_count,
        never_returned_patient_count,
        SUM(new_patient_count) OVER (ORDER BY month) AS cumulative_new_patient_count,
        SUM(retained_patient_count) OVER (ORDER BY month) AS cumulative_retained_patient_count,
        SUM(never_returned_patient_count) OVER (ORDER BY month) AS cumulative_never_returned_patient_count
    FROM 
        combined_data
    ORDER BY 
        month;
    `;

    // Exécuter la requête en passant les paramètres de date pour les filtrages
    connection.query(query, [startDate, endDate, startDate, endDate, startDate, endDate], (error, results) => {
      if (error) throw error;
      res.json(results);
    });
  });

  return router;
};
