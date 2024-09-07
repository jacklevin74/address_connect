const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Function to read the text file and parse its contents
function readTextFile(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.trim().split('\n');
    return lines.map(line => {
        const [ethAddress, solanaAddress] = line.split(':');
        return { ethAddress, solanaAddress };
    });
}

// Function to insert or update records in the SQLite database
function updateDatabase(records) {
    const db = new sqlite3.Database('signer_data.db', (err) => {
        if (err) {
            console.error('Error opening database:', err);
            return;
        }
        console.log('Connected to the SQLite database.');

        // Ensure the table exists
        db.run(`CREATE TABLE IF NOT EXISTS signers (
            solanaPubkey TEXT PRIMARY KEY,
            signerAddresses TEXT
        )`, (err) => {
            if (err) {
                console.error('Error creating table:', err);
                return;
            }

            // Process each record
            records.forEach(record => {
                db.get('SELECT signerAddresses FROM signers WHERE solanaPubkey = ?', [record.solanaAddress], (err, row) => {
                    if (err) {
                        console.error('Error querying database:', err);
                        return;
                    }

                    if (row) {
                        // Update existing record
                        let signerAddresses = row.signerAddresses.split(',');
                        if (!signerAddresses.includes(record.ethAddress)) {
                            signerAddresses.push(record.ethAddress);
                            db.run('UPDATE signers SET signerAddresses = ? WHERE solanaPubkey = ?', 
                                [signerAddresses.join(','), record.solanaAddress], (err) => {
                                    if (err) console.error('Error updating record:', err);
                                    else console.log(`Updated record for ${record.solanaAddress}. Total Ethereum addresses: ${signerAddresses.length}`);
                                });
                        }
                    } else {
                        // Insert new record
                        db.run('INSERT INTO signers (solanaPubkey, signerAddresses) VALUES (?, ?)', 
                            [record.solanaAddress, record.ethAddress], (err) => {
                                if (err) {
                                    if (err.code === 'SQLITE_CONSTRAINT') {
                                        console.log(`Duplicate solanaPubkey found for ${record.solanaAddress}. Appending Ethereum address.`);
                                        db.run('UPDATE signers SET signerAddresses = signerAddresses || ? WHERE solanaPubkey = ?', 
                                            [',' + record.ethAddress, record.solanaAddress], (updateErr) => {
                                                if (updateErr) console.error('Error appending Ethereum address:', updateErr);
                                                else console.log(`Appended Ethereum address for ${record.solanaAddress}`);
                                            });
                                    } else {
                                        console.error('Error inserting record:', err);
                                    }
                                } else {
                                    console.log(`Inserted new record for ${record.solanaAddress}. Total Ethereum addresses: 1`);
                                }
                            });
                    }
                });
            });
        });
    });

    // Close the database connection when all operations are complete
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
    });
}

// Main function to run the script
function main() {
    const filePath = 'signer_data.txt'; // Adjust this path if necessary
    const records = readTextFile(filePath);
    updateDatabase(records);
}

// Run the script
main();

