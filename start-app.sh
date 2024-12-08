#!/bin/sh

# Attendre que la base de données soit prête
echo "Attente de la base de données..."
./wait-for-it.sh db:3306 --timeout=30 -- echo "La base de données est prête"

# Démarrer le serveur Node.js
echo "Démarrage de l'application Node.js..."
node server.js
