import React from 'react';

function ChatBox({ messages }) {
  return (
    <div className="chat-box">
      <h2>Chat History</h2>
      {messages.map((msg, index) => (
        <div key={index} className="message">
          <strong>{msg.sender} to {msg.recipient}: </strong>{msg.message}
          <p className="encrypted">(Encrypted: {JSON.stringify(msg.encrypted)})</p>
        </div>
      ))}
    </div>
  );
}

export default ChatBox;
