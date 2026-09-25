// Entry for the content pages (About, FAQ, ...): styles, the nav menu, the issue
// report dialog, and the service worker so a first visit to any page makes the
// whole site work offline.
import './site.css';
import { initFeedback } from './feedback';
import { initMenu } from './site';

initMenu();
initFeedback();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}
