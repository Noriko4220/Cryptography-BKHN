const API_BASE_URL = 'http://localhost:3001/api';

export const generateCertificate = async (username) => {
  try {
    const response = await fetch(`${API_BASE_URL}/generateCertificate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error generating certificate:', error);
    return null;
  }
};

export const sendMessage = async (sender, recipient, message) => {
  try {
    const response = await fetch(`${API_BASE_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender, recipient, message }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
};
