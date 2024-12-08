const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const port = 3000;

// Configuration de la connexion à la base de données MySQL
const connection = mysql.createConnection({
  host: 'mariadb',
  user: 'root',
  password: 'yourpassword',
  database: 'kbmdocv2'
});

connection.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err.stack);
    return;
  }
  console.log('Connecté à la base de données en tant que l\'ID', connection.threadId);
});

// Middleware for parsing JSON request bodies (if needed)
app.use(express.json());

// Routes for static files (HTML, CSS, etc.)
app.use('/', express.static(path.join(__dirname, 'public')));

// Clé secrète pour JWT (à stocker dans les variables d'environnement en production)
const JWT_SECRET = 'your_secret_key';

// Middleware d'authentification JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(403).send('Accès refusé');

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).send('Token invalide');
    req.user = user;
    next();
  });
}

// Route d'inscription
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Hacher le mot de passe
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insérer l'utilisateur dans la base de données
  connection.query('INSERT INTO BI_users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
    if (err) {
      console.error('Erreur lors de l\'inscription:', err);
      return res.status(500).send('Erreur du serveur');
    }
    res.status(201).send('Utilisateur créé avec succès');
  });
});

// Route de connexion
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Rechercher l'utilisateur dans la base de données
  connection.query('SELECT * FROM BI_users WHERE username = ?', [username], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).send('Nom d\'utilisateur ou mot de passe incorrect');
    }

    const user = results[0];

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).send('Nom d\'utilisateur ou mot de passe incorrect');
    }

    // Générer un token JWT
    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
  });
});

// Routes existantes protégées par le middleware d'authentification
app.use('/api/actes', authenticateToken, require('./routes/actesRoute')(connection));
app.use('/api/stats', authenticateToken, require('./routes/statsRoute')(connection));
app.use('/api/doctors', authenticateToken, require('./routes/doctorsRoute')(connection));
app.use('/api/doctor-indicators', authenticateToken, require('./routes/doctorIndicatorsRoute')(connection));
app.use('/api/doctor-comparison', authenticateToken, require('./routes/doctorComparisonRoute')(connection));
app.use('/api/visits-revenue', authenticateToken,require('./routes/visitsRevenueRoute')(connection));
app.use('/api/patient-visits', authenticateToken, require('./routes/patientVisitsRoute')(connection));
app.use('/api/consultations', authenticateToken, require('./routes/consultationsRoute')(connection));
app.use('/api/heatmap-data', authenticateToken, require('./routes/heatmapRoute')(connection)); // Ensure this line is correct
app.use('/api/hourly-revenue',authenticateToken, require('./routes/hourlyRevenueRoute')(connection));
app.use('/api/medecins', authenticateToken, require('./routes/medecinsRoute')(connection));
app.use('/api/doctor-time-analysis', authenticateToken,require('./routes/doctorTimeAnalysisRoute')(connection));
app.use('/api/waiting-times', authenticateToken,require('./routes/waitingTimeRoute')(connection));
app.use('/api/waiting-times-heatmap', authenticateToken, require('./routes/waitingTimeHeatmapRoute')(connection));
app.use('/api/waiting-times-heatmap-doctor', authenticateToken,require('./routes/waitingTimeHeatmapDoctorRoute')(connection));
app.use('/api/rendezvous', authenticateToken,require('./routes/rendezvousRoute')(connection));


// Nouvelle route pour l'analyse des performances des médecins (protégée)
app.use('/api/doctor-performance', authenticateToken,require('./routes/doctor/doctorPerformanceRoute')(connection));
app.use('/api/doctor/patient-evolution',authenticateToken, require('./routes/doctor/patientEvolutionRoute')(connection));
app.use('/api/doctor/monthly-stats', authenticateToken,require('./routes/doctor/monthlyStatsRoute')(connection));




// Démarrer le serveur
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
