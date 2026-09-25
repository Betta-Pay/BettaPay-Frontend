import React, { useEffect, useState } from 'react';

export const GuideProgress = ({ guideId }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Fix: Persist guide reading progress in localStorage
    const saved = localStorage.getItem(`guide_prog_${guideId}`);
    if (saved) setProgress(Number(saved));
  }, [guideId]);

  const updateProgress = (val) => {
    setProgress(val);
    localStorage.setItem(`guide_prog_${guideId}`, val.toString());
  };

  return <progress value={progress} max={100} onClick={() => updateProgress(100)} />;
};
