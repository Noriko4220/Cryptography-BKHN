const express = require('express');
const cors = require('cors');
const crypto = require('node:crypto');
const { subtle } = crypto.webcrypto;

const app = express();
app.use(cors());
app.use(express.json());

const certificates = {};

async function generateKeyPair(username, role) {
  try {
    const keyPair = await subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      ['deriveKey', 'deriveBits']
    );

    const publicKeyJWK = await subtle.exportKey('jwk', keyPair.publicKey);

    certificates[username] = {
      username,
      role,
      privateKey: keyPair.privateKey,
      publicKey: publicKeyJWK,
    };

    console.log(`${role} certificate generated for ${username}`);
    return { username, role, publicKey: publicKeyJWK };
  } catch (error) {
    console.error('Error generating key pair:', error.message);
    throw new Error('Failed to generate key pair.');
  }
}

app.post('/api/generateKey', async (req, res) => {
  const { username, role } = req.body;

  if (!username || !role) {
    return res.status(400).json({ error: 'Username and role (sender/recipient) are required.' });
  }

  try {
    const certificate = await generateKeyPair(username, role);
    res.json(certificate);
  } catch (error) {
    console.error('Error generating key:', error.message);
    res.status(500).json({ error: 'Failed to generate key.' });
  }
});

app.post('/api/sendMessage', async (req, res) => {
  const { sender, recipient, plaintext } = req.body;

  if (!sender || !recipient || !plaintext) {
    return res.status(400).json({ error: 'Sender, recipient, and plaintext message are required.' });
  }

  try {
    const senderCert = certificates[sender];
    const recipientCert = certificates[recipient];

    if (!senderCert || !recipientCert) {
      throw new Error('Sender or recipient certificate not found.');
    }

    const recipientPublicKey = await subtle.importKey(
      'jwk',
      recipientCert.publicKey,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      []
    );

    const sharedSecret = await subtle.deriveBits(
      {
        name: 'ECDH',
        public: recipientPublicKey,
      },
      senderCert.privateKey,
      256
    );

    const iv = crypto.randomBytes(12);
    const aesKey = await subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const ciphertext = await subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      Buffer.from(plaintext, 'utf-8')
    );

    console.log('Message encrypted successfully.');
    res.json({
      header: { iv: Buffer.from(iv).toString('base64') },
      ciphertext: Buffer.from(ciphertext).toString('base64'),
    });
  } catch (error) {
    console.error('Error sending message:', error.message);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

app.get('/api/getPublicKey/:username', async (req, res) => {
  const { username } = req.params;

  if (!certificates[username]) {
    return res.status(404).json({ error: `Public key for ${username} not found.` });
  }

  res.json(certificates[username].publicKey);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
