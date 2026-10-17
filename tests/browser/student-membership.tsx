import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../src/App';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import '../../src/index.css';
import '../../src/native.css';
import '../../src/components/wordwall.css';
function StudentFixture() {
  const [ready, setReady] = useState(false), [error, setError] = useState('');
  useEffect(() => { let active = true;
    void supabase.auth.signInWithPassword({ email: 'student@example.invalid', password: 'ExampleOnly123' }).then(result => {
      if (!active) return; if (result.error) setError(result.error.message); else setReady(true);
    }); return () => { active = false; };
  }, []);
  if (error) return <p role="alert">{error}</p>;
  return ready ? <AuthProvider><App /></AuthProvider> : <p role="status">Öğrenci test ekranı açılıyor…</p>;
}
document.documentElement.dataset.nativeApp = 'android';
document.documentElement.style.setProperty('--safe-area-inset-top', '30px');
document.documentElement.style.setProperty('--safe-area-inset-bottom', '24px');
createRoot(document.getElementById('root')!).render(<StudentFixture />);
