import React, { useState } from 'react';

export const WebhookConfig = () => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    try {
      new URL(url); // Fix: Validates the endpoint URL before saving
      setError('');
      // save(url)
    } catch {
      setError('Invalid URL format');
    }
  };

  return (
    <div>
      <input value={url} onChange={e => setUrl(e.target.value)} />
      <button onClick={handleSave}>Save</button>
      {error && <span style={{color: 'red'}}>{error}</span>}
    </div>
  );
};
