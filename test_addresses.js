// Test script to check address format
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'mariadb',
    user: 'root',
    password: 'yourpassword',
    database: 'kbmdocv2'
});

connection.connect((err) => {
    if (err) {
        console.error('Error:', err);
        process.exit(1);
    }

    // Get sample addresses
    const query = `SELECT address FROM patient WHERE address IS NOT NULL AND address != '' LIMIT 10`;

    connection.query(query, (error, results) => {
        if (error) {
            console.error('Query error:', error);
            process.exit(1);
        }

        console.log('Sample addresses:');
        results.forEach((row, index) => {
            console.log(`${index + 1}. "${row.address}"`);
        });

        process.exit(0);
    });
});
