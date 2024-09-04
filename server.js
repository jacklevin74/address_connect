const express = require('express');
const ethers = require('ethers');
const fs = require('fs');
const cors = require('cors');  // Import the CORS middleware

const app = express();

// Enable CORS for all origins or restrict it to specific ones
app.use(cors({
  origin: '*'  // This will allow all origins. You can replace '*' with specific domains if needed
}));

app.use(express.json());

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
      const data = `Signer: ${signerAddress}\nSolana Public Key: ${solanaPubkey}\n`;
      fs.appendFileSync('signer_data.txt', data);

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
