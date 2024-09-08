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
                // Ensure the table exists with the correct structure
                db.run(`CREATE TABLE IF NOT EXISTS signers_normalized (
                    ethAddress TEXT PRIMARY KEY,
                    solanaPubkey TEXT
                )`, (err) => {
                    if (err) {
                        reject('Error creating table: ' + err.message);
                        return;
                    }

                    // Create an index on solanaPubkey for faster querying
                    db.run(`CREATE INDEX IF NOT EXISTS idx_solana_pubkey ON signers_normalized(solanaPubkey)`, (err) => {
                        if (err) {
                            reject('Error creating index: ' + err.message);
                            return;
                        }
                    });

                    // Begin transaction
                    db.run('BEGIN TRANSACTION');

                    const stmt = db.prepare(`INSERT OR REPLACE INTO signers_normalized (ethAddress, solanaPubkey) VALUES (?, ?)`);

                    records.forEach(record => {
                        stmt.run(record.ethAddress, record.solanaPubkey, (err) => {
                            if (err) console.error('Error inserting record:', err);
                            else console.log(`Inserted/Updated record: ${record.ethAddress}, ${record.solanaPubkey}`);
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

