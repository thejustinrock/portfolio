import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const container = document.querySelector('.projects');
const svg = d3.select('#projects-pie-plot');
const legend = d3.select('.legend');
const searchInput = document.querySelector('.searchBar');
const status = document.querySelector('#filter-status');
const clearButton = document.querySelector('#clear-filters');
let projects = [];
let query = '';
let selectedYear = null;
let colors;

// Both controls share this state. Year clicks must never bypass the search.
function searchProjects() {
  return projects.filter(project =>
    Object.values(project).join('\n').toLowerCase().includes(query.toLowerCase().trim())
  );
}

function toggleYear(year) {
  selectedYear = selectedYear === year ? null : year;
  update();
}

function renderPieChart(searchResults) {
  // The chart summarizes search matches; year selection narrows the cards.
  // Keep every matching year available so another year can be selected directly.
  const data = d3.rollups(searchResults, group => group.length, project => String(project.year))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => d3.descending(a.label, b.label));
  const arcs = d3.pie().sort(null).value(d => d.value)(data);
  const arc = d3.arc().innerRadius(0).outerRadius(48);
  // Keyed joins update existing elements and remove obsolete ones.
  svg.selectAll('path').data(arcs, d => d.data.label).join('path')
    .attr('d', arc)
    .attr('fill', d => colors(d.data.label))
    .attr('class', d => d.data.label === selectedYear ? 'selected' : null)
    .attr('role', 'button').attr('tabindex', 0)
    .attr('aria-label', d => `${d.data.label}: ${d.data.value} projects. Toggle year filter.`)
    .attr('aria-pressed', d => String(d.data.label === selectedYear))
    .on('click', (_, d) => toggleYear(d.data.label))
    .on('keydown', (event, d) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleYear(d.data.label);
      }
    })
    .selectAll('title').data(d => [d]).join('title')
    .text(d => `${d.data.label}: ${d.data.value} projects`);

  const items = legend.selectAll('li').data(data, d => d.label).join('li')
    .attr('class', d => `legend-item${d.label === selectedYear ? ' selected' : ''}`)
    .style('--color', d => colors(d.label));
  const buttons = items.selectAll('button').data(d => [d]).join('button')
    .attr('type', 'button').attr('aria-pressed', d => String(d.label === selectedYear))
    .attr('aria-label', d => `Filter by ${d.label}, ${d.value} projects`)
    .on('click', (_, d) => toggleYear(d.label));
  buttons.selectAll('.swatch').data(d => [d]).join('span')
    .attr('class', 'swatch').attr('aria-hidden', 'true');
  buttons.selectAll('.legend-label').data(d => [d]).join('span')
    .attr('class', 'legend-label').text(d => `${d.label} (${d.value})`);
  document.querySelector('#chart-empty').hidden = data.length > 0;
  svg.attr('aria-label', `Projects per year for ${searchResults.length} search matches. Select a slice to filter projects.`);
}

function update() {
  const searchResults = searchProjects();
  // Extra-credit fix: intersect the search results with the selected year.
  const visible = selectedYear === null ? searchResults :
    searchResults.filter(project => String(project.year) === selectedYear);
  renderProjects(visible, container, 'h2');
  if (!visible.length) container.textContent = 'No projects match these filters. Try another search or clear the filters.';
  renderPieChart(searchResults);
  document.querySelector('.projects-title').textContent = `Projects (${visible.length})`;
  status.textContent = `Showing ${visible.length} of ${projects.length} projects${selectedYear ? ` · Year: ${selectedYear}` : ''}${query.trim() ? ` · Search: “${query.trim()}”` : ''}.`;
  clearButton.disabled = !query && selectedYear === null;
}

try {
  projects = await fetchJSON(new URL('../lib/projects.json', import.meta.url));
  colors = d3.scaleOrdinal(d3.schemeTableau10)
    .domain([...new Set(projects.map(project => String(project.year)))].sort().reverse());
  update();
  searchInput.disabled = false;
  searchInput.addEventListener('input', event => { query = event.target.value; update(); });
  clearButton.addEventListener('click', () => {
    query = ''; selectedYear = null; searchInput.value = ''; update(); searchInput.focus();
  });
} catch (error) {
  console.error(error);
  container.textContent = 'Unable to load projects. Please refresh or try again later.';
  status.textContent = 'Projects could not be loaded.';
}
