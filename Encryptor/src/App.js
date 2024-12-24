import React, { useState, useEffect } from 'react';
import './App.css';
import ChatBox from './components/ChatBox';
import InputForm from './components/InputForm';
import { generateCertificate, sendMessage, receiveMessage } from './api';

function App() {
  const [username, setUsername] = useState('');
  const [certGenerated, setCertGenerated] = useState(false);
  const [messages, setMessages] = useState([]);

  const handleGenerateCertificate = async () => {
    const response = await generateCertificate(username);
    if (response) {
      alert(`Certificate generated for: ${username}`);
      setCertGenerated(true);
    }
  };

  const handleSendMessage = async (recipient, message) => {
    const response = await sendMessage(username, recipient, message);
    if (response) {
      setMessages([...messages, { sender: username, recipient, message, encrypted: response }]);
    }
  };

  useEffect(() => {
  }, [messages]);

  return (
    <div className="App">
      <h1>Secure Messenger</h1>
      {!certGenerated ? (
        <div className="certificate-section">
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button onClick={handleGenerateCertificate}>Generate Certificate</button>
        </div>
      ) : (
        <>
          <ChatBox messages={messages} />
          <InputForm onSendMessage={handleSendMessage} />
        </>
      )}
    </div>
  );
}

export default App;
