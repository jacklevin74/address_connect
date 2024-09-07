const express = require('express');
const ethers = require('ethers');
const fs = require('fs');
const cors = require('cors');  // Import the CORS middleware
const sqlite3 = require('sqlite3').verbose();

const app = express();

// Enable CORS for all origins or restrict it to specific ones
app.use(cors({
  origin: '*'  // This will allow all origins. You can replace '*' with specific domains if needed
}));

app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database('signer_data.db', (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS signers (
      solanaPubkey TEXT PRIMARY KEY,
      signerAddresses TEXT
    )`);
  }
});

app.post('/verify-message', async (req, res) => {
    try {
      const { message, signature, solanaPubkey } = req.body;

      if (!message || !signature || !solanaPubkey) {
        return res.status(400).json({ error: 'Message, signature, and Solana public key are required' });
      }

      // Recover the signer's address from the message and signature
      const signerAddress = ethers.verifyMessage(message, signature);

      console.log('Signer of the message: ' + signerAddress + ' SVM Pubkey: ' +solanaPubkey);

      // Write signer address and Solana public key to a text file
      const fileData = `${signerAddress}:${solanaPubkey}\n`;
      fs.appendFileSync('signer_data.txt', fileData);

      // Update or insert the signer address for the given Solana public key in the database
      db.get('SELECT signerAddresses FROM signers WHERE solanaPubkey = ?', [solanaPubkey], (err, row) => {
        if (err) {
          console.error('Error querying database:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (row) {
          // If the Solana public key exists, append the new signer address
          const signerAddresses = row.signerAddresses.split(',');
          if (!signerAddresses.includes(signerAddress)) {
            signerAddresses.push(signerAddress);
            db.run('UPDATE signers SET signerAddresses = ? WHERE solanaPubkey = ?', 
              [signerAddresses.join(','), solanaPubkey], (err) => {
                if (err) {
                  console.error('Error updating database:', err);
                  return res.status(500).json({ error: 'Internal server error' });
                }
              });
          }
        } else {
          // If the Solana public key doesn't exist, insert a new record
          db.run('INSERT INTO signers (solanaPubkey, signerAddresses) VALUES (?, ?)', 
            [solanaPubkey, signerAddress], (err) => {
              if (err) {
                console.error('Error inserting into database:', err);
                return res.status(500).json({ error: 'Internal server error' });
              }
            });
        }
      });

      res.json({ signer: signerAddress, solanaPubkey: solanaPubkey });
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

