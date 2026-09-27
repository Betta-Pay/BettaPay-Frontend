import React, { useState } from 'react';

export const ProfileEditor = () => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleBlur = () => {
    // Fix: Validate form fields on blur
    if (!name.trim()) setError('Name is required');
    else setError('');
  };

  return (
    <div>
      <input 
        value={name} 
        onChange={e => setName(e.target.value)} 
        onBlur={handleBlur} 
      />
      {error && <span style={{color: 'red'}}>{error}</span>}
    </div>
  );
};
