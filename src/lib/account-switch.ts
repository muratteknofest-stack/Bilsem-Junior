let revision = 0;
export function cancelAccountSwitch() { revision++; }
export function beginAccountSwitch() { const own = ++revision; return () => revision === own; }
