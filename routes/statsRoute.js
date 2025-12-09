const express = require('express');
const router = express.Router();

module.exports = (connection) => {
  router.get('/', async (req, res) => {
    const startDate = req.query['startDate'];
    const endDate = req.query['endDate'];

    // Validation des dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Les dates de début et de fin sont requises.' });
    }

    try {
      // Requête 1 & 2 : Total des visites et des patients
      const totalVisitsAndPatients = new Promise((resolve, reject) => {
        const query = `
          SELECT 
              COUNT(DISTINCT v.id) AS total_visits,
              COUNT(DISTINCT v.patient_id) AS total_patients
          FROM visit v
          WHERE v.currentLocalTimeAssignment BETWEEN ? AND ?;
        `;
        connection.query(query, [startDate, endDate], (error, results) => {
          if (error) return reject(error);
          resolve(results[0]);
        });
      });

      // Requête 3 : Nombre de nouveaux patients
      const newPatients = new Promise((resolve, reject) => {
        const query = `
          SELECT 
              COUNT(DISTINCT v.patient_id) AS new_patients
          FROM visit v
          JOIN (
              SELECT patient_id, MIN(arrivalDate) AS first_visit_date
              FROM visit
              GROUP BY patient_id
          ) AS first_visits ON v.patient_id = first_visits.patient_id
          WHERE first_visits.first_visit_date BETWEEN ? AND ?;
        `;
        connection.query(query, [startDate, endDate], (error, results) => {
          if (error) return reject(error);
          resolve(results[0]);
        });
      });

      // Requête 4 : Nombre de patients fidèles
      const loyalPatients = new Promise((resolve, reject) => {
        const query = `
          SELECT 
              COUNT(DISTINCT v.patient_id) AS loyal_patients
          FROM visit v
          JOIN (
              SELECT DISTINCT patient_id
              FROM visit
              WHERE arrivalDate < ?
          ) AS previous_visits ON v.patient_id = previous_visits.patient_id
          WHERE v.arrivalDate BETWEEN ? AND ?;
        `;
        connection.query(query, [startDate, startDate, endDate], (error, results) => {
          if (error) return reject(error);
          resolve(results[0]);
        });
      });

      // Requête 5 : Nouveaux patients qui ont continué à venir après la première visite
      const newPatientsContinued = new Promise((resolve, reject) => {
        const query = `
          SELECT 
              COUNT(DISTINCT v.patient_id) AS new_patients_continued
          FROM visit v
          JOIN (
              SELECT patient_id, MIN(arrivalDate) AS first_visit_date, COUNT(id) AS total_visits
              FROM visit
              GROUP BY patient_id
              HAVING first_visit_date BETWEEN ? AND ? AND total_visits > 1
          ) AS new_continued_patients ON v.patient_id = new_continued_patients.patient_id;
        `;
        connection.query(query, [startDate, endDate], (error, results) => {
          if (error) return reject(error);
          resolve(results[0]);
        });
      });

      // Requête 6 & 7 : Chiffre d'affaires (CA) et CA par heure
      const caAndCaPerHour = new Promise((resolve, reject) => {
        const query = `
          SELECT 
              (SELECT SUM(amount) FROM payment WHERE payment.date BETWEEN ? AND ?) AS CA,
              ROUND(
                  (SELECT SUM(amount) 
                   FROM payment 
                   WHERE payment.date BETWEEN ? AND ?) / 
                  (SELECT SUM(TIMESTAMPDIFF(SECOND, v.startdate, v.enddate)) / 3600 
                   FROM visit v 
                   WHERE v.currentLocalTimeAssignment BETWEEN ? AND ?)
              ) AS CA_Per_hour;
        `;
        connection.query(query, [startDate, endDate, startDate, endDate, startDate, endDate], (error, results) => {
          if (error) return reject(error);
          resolve(results[0]);
        });
      });

      // Requête 8 : Temps d'attente moyen
      const avgWaitingTime = new Promise((resolve, reject) => {
        const query = `
          SELECT 
              ROUND(AVG(TIMESTAMPDIFF(MINUTE, v.arrivalDate, v.endDate))) AS avg_waiting_time
          FROM visit v
          WHERE v.endDate IS NOT NULL AND v.currentLocalTimeAssignment BETWEEN ? AND ?;
        `;
        connection.query(query, [startDate, endDate], (error, results) => {
          if (error) return reject(error);
          resolve(results[0]);
        });
      });

      // Requête 9 : Nombre de rendez-vous générés
      const takedVisits = new Promise((resolve, reject) => {
        const query = `
          SELECT 
              COUNT(*) AS taked_visits
          FROM patient_service_event
          WHERE dateTaking BETWEEN ? AND ?;
        `;
        connection.query(query, [startDate, endDate], (error, results) => {
          if (error) return reject(error);
          resolve(results[0]);
        });
      });

      // Requête 10 : Revenu moyen par visite (hors pourcentage)
      const avgRevenuePerVisit = new Promise((resolve, reject) => {
        const query = `
          SELECT 
              ROUND(
                  (SELECT COALESCE(SUM(amount), 0) FROM payment WHERE payment.date BETWEEN ? AND ?) /
                  NULLIF((SELECT COUNT(DISTINCT v.id) FROM visit v WHERE v.currentLocalTimeAssignment BETWEEN ? AND ?), 0),
                  2
              ) AS avg_revenue_per_visit;
        `;
        connection.query(query, [startDate, endDate, startDate, endDate], (error, results) => {
          if (error) return reject(error);
          resolve(results[0]);
        });
      });

      // Requête 11 : Durée moyenne des visites (en minutes)
      const avgVisitDuration = new Promise((resolve, reject) => {
        const query = `
          SELECT 
              ROUND(
                  AVG(TIMESTAMPDIFF(MINUTE, v.startdate, v.enddate)),
                  2
              ) AS avg_visit_duration
          FROM visit v
          WHERE v.startdate IS NOT NULL 
              AND v.enddate IS NOT NULL 
              AND v.currentLocalTimeAssignment BETWEEN ? AND ?;
        `;
        connection.query(query, [startDate, endDate], (error, results) => {
          if (error) return reject(error);
          resolve(results[0]);
        });
      });

      // Requête 12 : Taux de non-présentation (no-show rate)
      const noShowRate = new Promise((resolve, reject) => {
        const query = `
          SELECT 
              ROUND(
                  ((SELECT COUNT(*) FROM patient_service_event WHERE dateTaking BETWEEN ? AND ?) -
                   (SELECT COUNT(DISTINCT v.id) FROM visit v WHERE v.currentLocalTimeAssignment BETWEEN ? AND ?)) /
                  NULLIF((SELECT COUNT(*) FROM patient_service_event WHERE dateTaking BETWEEN ? AND ?), 0) * 100,
                  2
              ) AS no_show_rate;
        `;
        connection.query(query, [startDate, endDate, startDate, endDate, startDate, endDate], (error, results) => {
          if (error) return reject(error);
          resolve(results[0]);
        });
      });

      // Exécution de toutes les requêtes en parallèle
      const results = await Promise.all([
        totalVisitsAndPatients,
        newPatients,
        loyalPatients,
        newPatientsContinued,
        caAndCaPerHour,
        avgWaitingTime,
        takedVisits,
        avgRevenuePerVisit,
        avgVisitDuration,
        noShowRate
      ]);

      // Envoi des résultats en réponse
      res.json({
        total_visits: results[0].total_visits,
        total_patients: results[0].total_patients,
        new_patients: results[1].new_patients,
        loyal_patients: results[2].loyal_patients,
        new_patients_continued: results[3].new_patients_continued,
        CA: results[4].CA,
        CA_Per_hour: results[4].CA_Per_hour,
        avg_waiting_time: results[5].avg_waiting_time,
        taked_visits: results[6].taked_visits,
        avg_revenue_per_visit: results[7].avg_revenue_per_visit || 0,
        avg_visit_duration: results[8].avg_visit_duration || 0,
        no_show_rate: results[9].no_show_rate || 0
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      res.status(500).json({ message: 'Erreur serveur' });
    }
  });

  return router;
};
