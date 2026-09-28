import React, { useState } from 'react';

export const VolumeCalculator = () => {
  const [volume, setVolume] = useState(0);

  const calculateFees = (vol) => {
    // Fix: Dynamic fee calculation instead of hardcoded returns
    return vol * 0.029 + 0.30;
  };

  return (
    <div>
      <input type="number" onChange={e => setVolume(Number(e.target.value))} />
      <p>Estimated Fees: ${calculateFees(volume)}</p>
    </div>
  );
};
