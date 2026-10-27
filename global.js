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


// Shared Lab 4 data and rendering helpers.
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
    throw error;
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!(containerElement instanceof Element)) throw new TypeError('A project container is required.');
  if (!Array.isArray(projects)) throw new TypeError('Projects must be an array.');
  const tag = /^h[1-6]$/.test(headingLevel) ? headingLevel : 'h2';
  containerElement.replaceChildren();
  if (!projects.length) {
    containerElement.textContent = 'No projects to display yet.';
    return;
  }
  for (const project of projects) {
    const article = document.createElement('article');
    const heading = document.createElement(tag);
    heading.textContent = project.title || 'Untitled project';
    if (project.url) {
      const link = document.createElement('a');
      link.href = new URL(project.url, siteRoot);
      link.textContent = heading.textContent;
      heading.replaceChildren(link);
    }
    article.append(heading);
    if (project.image) {
      const image = document.createElement('img');
      image.src = new URL(project.image, siteRoot).href;
      image.alt = heading.textContent;
      image.loading = 'lazy';
      image.addEventListener('error', () => image.remove(), { once: true });
      article.append(image);
    } else {
      article.classList.add('text-only');
    }
    const description = document.createElement('p');
    const year = document.createElement('span');
    year.className = 'project-year';
    year.textContent = `${project.year ?? 'Year not specified'}${project.placeholder ? ' · Placeholder' : ''}`;
    description.append(year, document.createTextNode(project.description || 'Description coming soon.'));
    article.append(description);
    containerElement.append(article);
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${encodeURIComponent(username)}`);
}
