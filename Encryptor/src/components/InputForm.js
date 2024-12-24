import React, { useState } from 'react';

function InputForm({ onSendMessage }) {
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (recipient && message) {
      onSendMessage(recipient, message);
      setRecipient('');
      setMessage('');
    }
  };

  return (
    <div className="input-form">
      <input
        type="text"
        placeholder="Recipient's username"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      />
      <textarea
        placeholder="Enter your message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}

export default InputForm;
