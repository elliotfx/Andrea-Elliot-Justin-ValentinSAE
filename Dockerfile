# Utiliser une image Node.js officielle
FROM node:14-bullseye

# Installer le client MySQL
RUN apt-get update && apt-get install -y default-mysql-client

# Définir le répertoire de travail
WORKDIR /usr/src/app

# Copier les fichiers de configuration
COPY package*.json ./


# Copier le reste du code source
COPY . .

# Donner les permissions d'exécution aux scripts
RUN chmod +x start-app.sh wait-for-it.sh

# Installer les dépendances
RUN npm install

# Exposer le port de l'application
EXPOSE 3000

# Démarrer l'application
CMD ["sh", "start-app.sh"]
