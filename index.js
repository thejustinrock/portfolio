import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

// Independent requests: a GitHub outage must not hide local projects.
async function loadProjects() {
  const container = document.querySelector('.projects');
  try {
    const projects = await fetchJSON(new URL('./lib/projects.json', import.meta.url));
    renderProjects(projects.slice(0, 3), container, 'h3');
  } catch (error) {
    container.textContent = 'Unable to load projects. Please refresh or try again later.';
  }
}
async function loadProfile() {
  const profileStats = document.querySelector('#profile-stats');
  if (!profileStats) return;
  try {
    const githubData = await fetchGitHubData('thejustinrock');
    const list = document.createElement('dl');
    for (const [label, field] of [['Public Repos', 'public_repos'], ['Public Gists', 'public_gists'], ['Followers', 'followers'], ['Following', 'following']]) {
      const term = document.createElement('dt');
      const value = document.createElement('dd');
      term.textContent = label;
      value.textContent = githubData[field] ?? 0;
      list.append(term, value);
    }
    profileStats.replaceChildren(list);
  } catch (error) {
    profileStats.textContent = 'GitHub statistics are temporarily unavailable. Please try again later.';
  }
}
await Promise.all([loadProjects(), loadProfile()]);
