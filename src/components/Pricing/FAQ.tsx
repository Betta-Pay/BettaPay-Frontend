import React, { useState } from 'react';

export const FAQ = ({ questions }) => {
  const [search, setSearch] = useState('');
  
  const filtered = questions.filter(q => q.question.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <input 
        type="text" 
        placeholder="Search FAQ..." 
        value={search}
        onChange={e => setSearch(e.target.value)} 
      />
      {filtered.map((q, idx) => (
        <div key={idx}>
          <h4>{q.question}</h4>
          <p>{q.answer}</p>
        </div>
      ))}
    </div>
  );
};
