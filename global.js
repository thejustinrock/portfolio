console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Resolve the site root from this module so localhost and /porfolio/ both work
const siteRoot = new URL('./', import.meta.url);
const pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/thejustinrock', title: 'GitHub' },
];
const nav = document.createElement('nav');
nav.setAttribute('aria-label', 'Main navigation');
document.body.prepend(nav);
const normalizedPath = path => path.replace(/index\.html$/, '').replace(/\/$/, '');
for (const page of pages) {
  const link = document.createElement('a');
  link.href = new URL(page.url, siteRoot).href;
  link.textContent = page.title;
  if (link.origin === location.origin && normalizedPath(link.pathname) === normalizedPath(location.pathname)) {
    link.classList.add('current');
    link.setAttribute('aria-current', 'page');
  }
  if (link.origin !== location.origin) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  nav.append(link);
}

document.body.insertAdjacentHTML('afterbegin', `
  <label class="color-scheme">Theme:
    <select aria-label="Color theme">
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
`);
const select = document.querySelector('.color-scheme select');
function setColorScheme(value) {
  const scheme = ['light dark', 'light', 'dark'].includes(value) ? value : 'light dark';
  document.documentElement.style.setProperty('color-scheme', scheme);
  select.value = scheme;
}
let savedScheme = 'light dark';
try { savedScheme = localStorage.getItem('colorScheme') || savedScheme; } catch {}
setColorScheme(savedScheme);
select.addEventListener('input', event => {
  setColorScheme(event.target.value);
  try { localStorage.setItem('colorScheme', event.target.value); } catch {}
});

// Encode subjects and messages correctly for email apps
const form = document.querySelector('form[action^="mailto:"]');
form?.addEventListener('submit', event => {
  event.preventDefault();
  const params = [];
  for (const [name, value] of new FormData(form)) {
    params.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
  }
  location.href = `${form.action}?${params.join('&')}`;
});
