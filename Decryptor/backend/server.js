const express = require('express');
const cors = require('cors');
const crypto = require('node:crypto');
const { subtle } = crypto.webcrypto;
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const certificates = {
  Alice: {
    username: 'Alice',
    privateKey: null,
    publicKey: {},
  },
};

async function fetchRecipientData(recipient) {
  try {
    const publicKeyResponse = await axios.get(`http://localhost:3001/api/getPublicKey/${recipient}`);
    const publicKey = publicKeyResponse.data;

    const privateKeyResponse = await axios.get(`http://localhost:3001/api/getPrivateKey/${recipient}`);
    const privateKey = privateKeyResponse.data;

    return {
      ...publicKey,
      d: privateKey.d,
    };
  } catch (error) {
    console.error(`Error fetching recipient data: ${error.message}`);
    throw new Error('Failed to retrieve recipient data from the encryption server.');
  }
}

async function importPrivateKey(privateKeyJWK) {
  try {
    if (!privateKeyJWK.d || !privateKeyJWK.crv) {
      throw new Error('Invalid private key format: Missing d or crv.');
    }

    const priKeyJWK = { ...privateKeyJWK };
    delete priKeyJWK.key_ops;

    return await subtle.importKey(
      'jwk',
      priKeyJWK,
      { name: 'ECDH', namedCurve: priKeyJWK.crv },
      true,
      ['deriveKey', 'deriveBits']
    );
  } catch (error) {
    console.error('Error importing private key:', error.message);
    throw new Error('Failed to import private key.');
  }
}

async function importPublicKey(jwkKey) {
  try {
    if (!jwkKey.x || !jwkKey.y || !jwkKey.crv) {
      throw new Error('Invalid public key format: Missing x, y, or crv.');
    }

    const publicKeyJWK = { ...jwkKey };
    delete publicKeyJWK.d;

    return await subtle.importKey(
      'jwk',
      publicKeyJWK,
      { name: 'ECDH', namedCurve: publicKeyJWK.crv },
      true,
      []
    );
  } catch (error) {
    console.error('Error importing public key:', error.message);
    throw new Error('Failed to import public key.');
  }
}

app.post('/api/decryptMessage', async (req, res) => {
  const { recipient, message } = req.body;
  const { header, ciphertext } = message;

  if (!recipient || !message) {
    return res.status(400).json({ error: 'Recipient and message are required.' });
  }

  try {
    const recipientData = await fetchRecipientData(recipient);
    console.log(`Fetched recipient data for ${recipient}:`, recipientData);

    const publicKey = await importPublicKey(recipientData);
    const privateKey = await importPrivateKey(recipientData);

    const sharedSecret = await subtle.deriveBits(
      {
        name: 'ECDH',
        public: publicKey,
      },
      privateKey,
      256
    );

    const aesKey = await subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const iv = Buffer.from(header.iv, 'base64');
    const ciphertextBuffer = Buffer.from(ciphertext, 'base64');

    const plaintextBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      ciphertextBuffer
    );

    const plaintext = Buffer.from(plaintextBuffer).toString('utf-8');
    res.json({ plaintext });
  } catch (error) {
    console.error('Error during decryption:', error.message);
    res.status(500).json({ error: 'Decryption failed.' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Decryption server running on port ${PORT}`);
});
