const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3003;
const host = 'localhost';

app.use(cors());
app.use(express.static('public')); // Serve static files like CSS or JS

// Initialize SQLite database
const db = new sqlite3.Database('signer_data.db', (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS signers_normalized (
            ethAddress TEXT PRIMARY KEY,
            solanaPubkey TEXT
        )`, (err) => {
            if (err) {
                console.error('Error creating table', err);
            }
        });

        // Create an index on solanaPubkey to speed up queries
        db.run(`CREATE INDEX IF NOT EXISTS idx_solana_pubkey ON signers_normalized(solanaPubkey)`, (err) => {
            if (err) {
                console.error('Error creating index:', err);
            }
        });
    }
});

// Function to truncate Ethereum and Solana addresses
function truncateAddress(address) {
    if (address.length <= 17) return address;
    return `${address.slice(0, 10)}..${address.slice(-10)}`;
}

// Route to serve the webpage
app.get('/reg-ledger', (req, res) => {
    db.all('SELECT ethAddress, solanaPubkey FROM signers_normalized', [], (err, rows) => {
        if (err) {
            console.error('Error querying database:', err);
            return res.status(500).send('Internal server error');
        }

        res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>XENBLOCKs to SVM Address Mapping</title>
            <style>
                body {
                    font-family: 'Courier New', Courier, monospace;
                    background-color: black;
                    color: #00FF41;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 10px;
                    box-sizing: border-box;
                }
                h1 {
                    font-size: 1.5rem;
                    text-shadow: 0 0 10px #00FF41;
                    margin-bottom: 20px;
                }
                table {
                    border-collapse: collapse;
                    margin: 20px 0;
                    width: 100%;
                    max-width: 600px;
                }
                th, td {
                    border: 1px solid #00FF41;
                    padding: 5px;
                    text-align: left;
                    color: #f0f0f0;
                    font-size: 0.8rem;
                }
                th {
                    background-color: #333;
                }
                td {
                    background-color: #1a1a1a;
                }
                tr:hover td {
                    background-color: #00FF41;
                    color: black;
                    text-shadow: 0 0 5px #00FF41;
                    transition: all 0.3s ease;
                }
                footer {
                    margin-top: 20px;
                    text-align: center;
                    color: #00FF41;
                    font-size: 0.8rem;
                }
            </style>
        </head>
        <body>
            <h1>XENBLOCKs to SVM X1 Address Mapping</h1>
            <table>
                <tr>
                    <th>XENBLOCKs Address</th>
                    <th>SVM X1 Address</th>
                </tr>
                ${rows.map(row => `
                <tr>
                    <td>${truncateAddress(row.ethAddress)}</td>
                    <td>${truncateAddress(row.solanaPubkey)}</td>
                </tr>
                `).join('')}
            </table>
            <footer>Matrix Web3 Interface - XENBLOCKs Network</footer>
        </body>
        </html>
        `);
    });
});

// Function to get Solana public key for a given Ethereum address
function getSolanaPubkey(ethAddress) {
    return new Promise((resolve, reject) => {
        db.get('SELECT solanaPubkey FROM signers_normalized WHERE ethAddress = ?', [ethAddress], (err, row) => {
            if (err) {
                return reject(err);
            }
            resolve(row ? row.solanaPubkey : null);
        });
    });
}

// Route for API to query by Ethereum address
app.get('/reg-ledger-api', async (req, res) => {
    const ethAddress = req.query.address;
    if (!ethAddress) {
        return res.status(400).json({ error: 'Ethereum address is required' });
    }

    try {
        const x1Address = await getSolanaPubkey(ethAddress);
        if (x1Address) {
            res.json({ ethAddress, x1Address});
        } else {
            res.status(404).json({ error: 'No matching Solana public key found for the given Ethereum address' });
        }
    } catch (error) {
        console.error('Error querying database:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route for API with path parameter for Ethereum address
app.get('/reg-ledger-api/:ethAddress', async (req, res) => {
    const ethAddress = req.params.ethAddress;

    try {
        const x1Address = await getSolanaPubkey(ethAddress);
        if (x1Address) {
            res.json({ ethAddress, x1Address});
        } else {
            res.status(404).json({ error: 'No matching Solana public key found for the given Ethereum address' });
        }
    } catch (error) {
        console.error('Error querying database:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to query by Solana public key
app.get('/reg-ledger-db-api/:solanaPubkey', (req, res) => {
    const solanaPubkey = req.params.solanaPubkey;

    db.all('SELECT ethAddress FROM signers_normalized WHERE solanaPubkey = ?', [solanaPubkey], (err, rows) => {
        if (err) {
            console.error('Error querying database:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (rows.length > 0) {
            const ethAddresses = rows.map(row => row.ethAddress);
            res.json({ solanaPubkey, ethAddresses });
        } else {
            res.status(404).json({ error: 'No matching Ethereum addresses found for the given Solana public key' });
        }
    });
});

app.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});

