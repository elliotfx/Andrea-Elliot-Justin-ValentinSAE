
# **MYDental BI**  

## **Description**  
Le centre dentaire "MYDental" est doté d'une application BI permettant de suivre les performances des médecins, de suivre les visites des patients, et de visualiser des indicateurs clés à travers des tableaux de bord interactifs.  

---

## **Prérequis**  
- **Docker** et **Docker Compose** installés sur votre machine.  
- **Navigateurs supportés :** Chrome, Firefox, Edge, Safari.  

---

## **Installation**  
1. Décompressez le fichier `import.sql.zip`  

2. Lancez l'application avec Docker Compose :  
   ```bash
   docker-compose up --build
   ```

---

## **Accès à l'Application**  

- **URL principale :**  
  [http://localhost:3000/](http://localhost:3000/)  

- **Tableau de bord de performance des médecins :**  
  [http://localhost:3000/doctorPerformance.html](http://localhost:3000/doctorPerformance.html)  

---

## **Informations de Connexion**  

- **Identifiant :** `admin`  
- **Mot de passe :** `admin`  

---

## **Technologies Utilisées**  

- **Backend :** Node.js, Express.js  
- **Base de données :** MariaDB
- **Frontend :** HTML, CSS, JavaScript, D3.js  
- **Gestion des conteneurs :** Docker, Docker Compose  


## **Problèmes Courants**  

- **Erreur de connexion à la base de données** : Vérifiez le fichier `docker-compose.yml` pour les configurations de la base de données.  
- **Port déjà utilisé** : Changez le port dans le fichier `docker-compose.yml`.  
