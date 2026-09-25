// Entry for the content pages (About, FAQ, ...): styles only, plus the service
// worker so a first visit to any page makes the whole site work offline.
import './site.css';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}
