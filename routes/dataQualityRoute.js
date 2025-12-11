const express = require('express');
const router = express.Router();

module.exports = (connection) => {
  // Route pour obtenir tous les indicateurs de qualité des données
  router.get('/', async (req, res) => {
    try {
      // Requête pour lastName NULL
      const lastNameNull = new Promise((resolve, reject) => {
        const query = `
          SELECT COUNT(*) AS count
          FROM patient
          WHERE lastName IS NULL OR lastName = '';
        `;
        connection.query(query, (error, results) => {
          if (error) return reject(error);
          resolve(results[0].count);
        });
      });

      // Requête pour firstName NULL
      const firstNameNull = new Promise((resolve, reject) => {
        const query = `
          SELECT COUNT(*) AS count
          FROM patient
          WHERE firstName IS NULL OR firstName = '';
        `;
        connection.query(query, (error, results) => {
          if (error) return reject(error);
          resolve(results[0].count);
        });
      });

      // Requête pour birthDate < 1930-01-01
      const birthDateInvalid = new Promise((resolve, reject) => {
        const query = `
          SELECT COUNT(*) AS count
          FROM patient
          WHERE birthDate < '1930-01-01' OR birthDate IS NULL;
        `;
        connection.query(query, (error, results) => {
          if (error) return reject(error);
          resolve(results[0].count);
        });
      });

      // Requête pour address NULL
      const addressNull = new Promise((resolve, reject) => {
        const query = `
          SELECT COUNT(*) AS count
          FROM patient
          WHERE address IS NULL OR address = '';
        `;
        connection.query(query, (error, results) => {
          if (error) return reject(error);
          resolve(results[0].count);
        });
      });

      // Requête pour phone NULL
      const phoneNull = new Promise((resolve, reject) => {
        const query = `
          SELECT COUNT(*) AS count
          FROM patient
          WHERE phone IS NULL OR phone = '';
        `;
        connection.query(query, (error, results) => {
          if (error) return reject(error);
          resolve(results[0].count);
        });
      });

      // Requête pour gender NULL
      const genderNull = new Promise((resolve, reject) => {
        const query = `
          SELECT COUNT(*) AS count
          FROM patient
          WHERE gender IS NULL OR gender = '';
        `;
        connection.query(query, (error, results) => {
          if (error) return reject(error);
          resolve(results[0].count);
        });
      });

      // Requête pour le nombre total de patients
      const totalPatients = new Promise((resolve, reject) => {
        const query = `
          SELECT COUNT(*) AS count
          FROM patient;
        `;
        connection.query(query, (error, results) => {
          if (error) return reject(error);
          resolve(results[0].count);
        });
      });

      // Exécuter toutes les requêtes en parallèle
      const [lastNameNullCount, firstNameNullCount, birthDateInvalidCount, addressNullCount, phoneNullCount, genderNullCount, totalPatientsCount] = await Promise.all([
        lastNameNull,
        firstNameNull,
        birthDateInvalid,
        addressNull,
        phoneNull,
        genderNull,
        totalPatients
      ]);

      // Calculer les pourcentages
      const calculatePercentage = (count, total) => {
        return total > 0 ? ((count / total) * 100).toFixed(2) : 0;
      };

      res.json({
        totalPatients: totalPatientsCount,
        lastNameNull: {
          count: lastNameNullCount,
          percentage: calculatePercentage(lastNameNullCount, totalPatientsCount)
        },
        firstNameNull: {
          count: firstNameNullCount,
          percentage: calculatePercentage(firstNameNullCount, totalPatientsCount)
        },
        birthDateInvalid: {
          count: birthDateInvalidCount,
          percentage: calculatePercentage(birthDateInvalidCount, totalPatientsCount)
        },
        addressNull: {
          count: addressNullCount,
          percentage: calculatePercentage(addressNullCount, totalPatientsCount)
        },
        phoneNull: {
          count: phoneNullCount,
          percentage: calculatePercentage(phoneNullCount, totalPatientsCount)
        },
        genderNull: {
          count: genderNullCount,
          percentage: calculatePercentage(genderNullCount, totalPatientsCount)
        }
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des données de qualité:', error);
      res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
  });

  return router;
};
