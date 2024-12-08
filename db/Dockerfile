# Utiliser l'image officielle de MariaDB 5.5.68
FROM mariadb

# Copier le fichier SQL dans le dossier docker-entrypoint-initdb.d
# Le fichier SQL sera exécuté automatiquement lors du premier démarrage de MariaDB
COPY ./sql/import.sql /docker-entrypoint-initdb.d/

# Exposer le port 3306
EXPOSE 3306