const express = require('express');
const fs = require('fs');
const app = express();
const port = 3003;
const host = 'localhost';  // Set your specific IP address
//const host = '186.233.186.56';  // Set your specific IP address

// Serve static files like CSS or JS
app.use(express.static('public'));

// Function to read signer_data.txt and format it into an array of objects
// Ensures unique Ethereum addresses by filtering out duplicates and records where the second field starts with '0x'
function getSignerData() {
    const data = fs.readFileSync('signer_data.txt', 'utf8');
    const lines = data.trim().split('\n');

    const uniqueEntries = new Map(); // Use a Map to ensure uniqueness

    lines.forEach(line => {
        const [xenblocksAddress, svmAddress] = line.split(':');
        // Ignore the record if the second field (SVM X1 Address) starts with '0x'
        if (svmAddress && !svmAddress.startsWith('0x') && !uniqueEntries.has(xenblocksAddress)) {
            uniqueEntries.set(xenblocksAddress, svmAddress);
        }
    });

    // Convert the Map back to an array of objects for rendering in the table
    return Array.from(uniqueEntries, ([xenblocksAddress, svmAddress]) => ({ xenblocksAddress, svmAddress }));
}

// Function to truncate address
function truncateAddress(address) {
    if (address.length <= 17) return address;  // Increased from 13 to 17 (30% wider)
    return `${address.slice(0, 8)}..${address.slice(-8)}`;  // Increased from 6 to 8 characters on each side
}

// Route to serve the webpage
app.get('/reg-ledger', (req, res) => {
    const data = getSignerData();
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
                max-width: 600px;  // Reduced to match mobile size
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
            ${data.map(row => `
            <tr>
                <td>${truncateAddress(row.xenblocksAddress)}</td>
                <td>${truncateAddress(row.svmAddress)}</td>
            </tr>
            `).join('')}
        </table>
        <footer>Matrix Web3 Interface - XENBLOCKs Network</footer>
    </body>
    </html>
    `);
});

// Function to get Solana address for a given Ethereum address
function getSolanaAddress(ethereumAddress) {
    const data = getSignerData();
    const matchingEntry = data.find(entry => entry.xenblocksAddress.toLowerCase() === ethereumAddress.toLowerCase());
    return matchingEntry ? matchingEntry.svmAddress : null;
}

// Route for API with query parameter
app.get('/reg-ledger-api', (req, res) => {
    const ethereumAddress = req.query.address;
    if (!ethereumAddress) {
        return res.status(400).json({ error: 'Ethereum address is required' });
    }

    const solanaAddress = getSolanaAddress(ethereumAddress);

    if (solanaAddress) {
        res.json({ ethereumAddress, solanaAddress });
    } else {
        res.status(404).json({ error: 'No matching Solana address found for the given Ethereum address' });
    }
});

// Route for API with path parameter
app.get('/reg-ledger-api/:ethereumAddress', (req, res) => {
    const ethereumAddress = req.params.ethereumAddress;
    const solanaAddress = getSolanaAddress(ethereumAddress);

    if (solanaAddress) {
        res.json({ ethereumAddress, solanaAddress });
    } else {
        res.status(404).json({ error: 'No matching Solana address found for the given Ethereum address' });
    }
});

app.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});
