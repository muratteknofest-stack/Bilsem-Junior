/// <reference types="vite/client" />

interface Window {
  __bilsemBoot?: { ready: () => void; fail: () => void; retry: () => void };
}
