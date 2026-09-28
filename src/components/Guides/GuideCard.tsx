import React from 'react';
import { useGuideData } from '../../hooks/useGuideData';

export const GuideCard = ({ guideId }) => {
  // Fix: Fetches real guide data dynamically from the API/hook
  const { data } = useGuideData(guideId);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="card">
      <h3>{data.title}</h3>
      <p>{data.summary}</p>
    </div>
  );
};
