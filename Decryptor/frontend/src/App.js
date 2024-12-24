import React, { useState } from 'react';

const App = () => {
  const [recipient, setRecipient] = useState('');
  const [ciphertext, setCiphertext] = useState('');
  const [iv, setIv] = useState('');
  const [decryptedMessage, setDecryptedMessage] = useState('');

  const handleDecrypt = async () => {
    const message = {
      header: { iv },
      ciphertext,
    };

    try {
      const response = await fetch('http://localhost:4000/api/decryptMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient, message }),
      });

      const result = await response.json();
      if (response.ok) {
        setDecryptedMessage(result.plaintext);
      } else {
        console.error('Decryption failed:', result.error);
        setDecryptedMessage('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error communicating with backend:', error);
      setDecryptedMessage('Error: Failed to connect to the server.');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Message Decryption</h1>
      <input
        type="text"
        placeholder="Recipient username"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        style={{ display: 'block', marginBottom: '10px' }}
      />
      <textarea
        placeholder="Ciphertext (base64)"
        value={ciphertext}
        onChange={(e) => setCiphertext(e.target.value)}
        style={{ display: 'block', marginBottom: '10px', width: '100%', height: '80px' }}
      />
      <input
        type="text"
        placeholder="IV (base64)"
        value={iv}
        onChange={(e) => setIv(e.target.value)}
        style={{ display: 'block', marginBottom: '10px' }}
      />
      <button onClick={handleDecrypt} style={{ marginBottom: '10px' }}>Decrypt</button>
      <div>
        <h3>Decrypted Message:</h3>
        <p>{decryptedMessage}</p>
      </div>
    </div>
  );
};

export default App;
