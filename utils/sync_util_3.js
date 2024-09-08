const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Function to read the text file and parse its contents
function readTextFile(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.trim().split('\n');
    return lines.map(line => {
        const [ethAddress, solanaPubkey] = line.split(':');
        return { ethAddress, solanaPubkey };
    });
}

// Function to insert records into the SQLite database
function insertIntoDatabase(records) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('signer_data.db', (err) => {
            if (err) {
                reject('Error opening database: ' + err.message);
                return;
            }
            console.log('Connected to the SQLite database.');

            db.serialize(() => {
                // Ensure the table exists
                db.run(`CREATE TABLE IF NOT EXISTS signers_normalized (
                    solanaPubkey TEXT,
                    ethAddress TEXT,
                    PRIMARY KEY (solanaPubkey, ethAddress)
                )`, (err) => {
                    if (err) {
                        reject('Error creating table: ' + err.message);
                        return;
                    }

                    // Begin transaction
                    db.run('BEGIN TRANSACTION');

                    const stmt = db.prepare(`INSERT OR IGNORE INTO signers_normalized (solanaPubkey, ethAddress) VALUES (?, ?)`);

                    records.forEach(record => {
                        stmt.run(record.solanaPubkey, record.ethAddress, (err) => {
                            if (err) console.error('Error inserting record:', err);
                            else console.log(`Inserted record: ${record.solanaPubkey}, ${record.ethAddress}`);
                        });
                    });

                    stmt.finalize();

                    // Commit transaction
                    db.run('COMMIT', (err) => {
                        if (err) reject('Error committing transaction: ' + err.message);
                        else resolve();
                    });
                });
            });

            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed.');
                }
            });
        });
    });
}

// Main function to run the script
async function main() {
    try {
        const filePath = 'signer_data.txt'; // Adjust this path if necessary
        const records = readTextFile(filePath);
        await insertIntoDatabase(records);
        console.log('Database update completed successfully.');
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

// Run the script
main();
