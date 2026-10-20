import './index.css';
import './components/wordwall.css';

// Dynamic import lets the independent shell report dependency initialization failures.
void import('./mount-app').then(module => module.mountApp()).catch(() => {
  window.__bilsemBoot?.fail();
});
