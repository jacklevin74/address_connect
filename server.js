const express = require('express');
const ethers = require('ethers');
const fs = require('fs');
const cors = require('cors');  // Import the CORS middleware
const sqlite3 = require('sqlite3').verbose();
const bs58 = require('bs58');

const app = express();

// Enable CORS for all origins or restrict it to specific ones
app.use(cors({
  origin: '*'  // This will allow all origins. You can replace '*' with specific domains if needed
}));

app.use(express.json());

// Function to check if the input is a valid Base58 Solana public key
function isValidBase58(pubkey) {
    try {
        const decoded = bs58.decode(pubkey);
        return decoded.length === 32; // Solana public keys are 32 bytes
    } catch (error) {
        console.error('Error decoding Solana public key:', error);
        return false;
    }
}

// Initialize SQLite database with the new schema
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

app.post('/verify-message', async (req, res) => {
  try {
    const { message, signature, solanaPubkey } = req.body;

    if (!message || !signature || !solanaPubkey) {
      return res.status(400).json({ error: 'Message, signature, and Solana public key are required' });
    }

    // Validate Solana public key
    if (!isValidBase58(solanaPubkey)) {
      return res.status(400).json({ error: 'Invalid Solana public key' });
    }

    // Recover the signer's Ethereum address from the message and signature
    const ethAddress = ethers.verifyMessage(message, signature);

    console.log('Signer of the message: ' + ethAddress + ' Solana Pubkey: ' + solanaPubkey);

    // Write signer address and Solana public key to a text file
    const fileData = `${ethAddress}:${solanaPubkey}\n`;
    fs.appendFileSync('signer_data.txt', fileData);

    // Insert or update the signer address and associated Solana public key in the database
    db.run(
      `INSERT OR REPLACE INTO signers_normalized (ethAddress, solanaPubkey) VALUES (?, ?)`,
      [ethAddress, solanaPubkey],
      (err) => {
        if (err) {
          console.error('Error inserting or replacing into database:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        res.json({ ethAddress: ethAddress, solanaPubkey: solanaPubkey });
      }
    );
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Close the database connection when the app is terminated
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Closed the database connection.');
    process.exit(0);
  });
});
