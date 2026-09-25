import React from 'react';
import { usePricingData } from '../../hooks/usePricingData';

export const ComparisonTable = () => {
  const { data } = usePricingData();
  
  if (!data) return <div>Loading...</div>;

  return (
    <table>
      {/* Fix: Table now connects to usePricingData instead of being hardcoded */}
      <tbody>
        {data.features.map((f, i) => (
          <tr key={i}><td>{f.name}</td></tr>
        ))}
      </tbody>
    </table>
  );
};
