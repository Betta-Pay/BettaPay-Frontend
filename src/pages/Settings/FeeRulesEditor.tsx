import React, { useState } from 'react';

export const FeeRulesEditor = () => {
  const [rule, setRule] = useState('');

  const saveRule = async () => {
    // Fix: Persist fee rule editor changes to the backend
    await fetch('/api/settings/fee-rules', {
      method: 'POST',
      body: JSON.stringify({ rule })
    });
  };

  return (
    <div>
      <textarea value={rule} onChange={e => setRule(e.target.value)} />
      <button onClick={saveRule}>Save Rule</button>
    </div>
  );
};
