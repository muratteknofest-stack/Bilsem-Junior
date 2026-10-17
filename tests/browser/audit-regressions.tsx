import React, { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { WordwallLibrary } from '../../src/components/WordwallLibrary';
import '../../src/index.css';
import '../../src/components/wordwall.css';

function AuditFixture() {
  const [owner, setOwner] = useState<string | undefined>('student-a');
  const [visible, setVisible] = useState(true);
  return <>
    <nav aria-label="Test hesapları">
      <button onClick={() => setOwner('student-a')}>Öğrenci A</button>
      <button onClick={() => setOwner('student-b')}>Öğrenci B</button>
      <button onClick={() => setOwner(undefined)}>Misafir</button>
      <button onClick={() => setVisible(value => !value)}>Test alanını aç/kapat</button>
    </nav>
    {visible && <WordwallLibrary initialGrade={1} progressOwnerId={owner} />}
  </>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><AuditFixture /></StrictMode>);
