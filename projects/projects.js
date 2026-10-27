import { fetchJSON, renderProjects } from '../global.js';

const container = document.querySelector('.projects');
try {
  const projects = await fetchJSON(new URL('../lib/projects.json', import.meta.url));
  renderProjects(projects, container, 'h2');
  document.querySelector('.projects-title').textContent = `Projects (${projects.length})`;
} catch (error) {
  container.textContent = 'Unable to load projects. Please refresh or try again later.';
}
