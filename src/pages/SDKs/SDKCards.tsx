import React, { useState } from 'react';
import { useSDKList } from '../../hooks/useSDKList';

export const SDKCards = () => {
  // Fix: Fetches dynamic SDK data instead of hardcoded arrays, and supports filtering
  const { sdks } = useSDKList();
  const [filter, setFilter] = useState('');

  const filtered = sdks?.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <input placeholder="Filter SDKs..." onChange={e => setFilter(e.target.value)} />
      {filtered?.map(s => <div key={s.id}>{s.name}</div>)}
    </div>
  );
};
