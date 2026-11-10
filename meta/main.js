import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const repo = 'https://github.com/thejustinrock/porfolio';
const countFormat = d3.format(',d');
const dateFormat = d3.utcFormat('%b %d, %Y');
const shortDate = d3.utcFormat('%b %d');
const hourFormat = d3.utcFormat('%-I:%M %p');

function processCommits(data) {
  return d3.groups(data, line => line.commit).map(([id, lines]) => {
    const { author, date, time, timezone } = lines[0];
    // Use the recorded date and clock time consistently across viewers' time zones.
    const clockTime = new Date(`${date}T${time}Z`);
    const commit = {
      id,
      author,
      timezone,
      clockTime,
      day: d3.utcDay.floor(clockTime),
      hour: clockTime.getUTCHours() + clockTime.getUTCMinutes() / 60
        + clockTime.getUTCSeconds() / 3600,
      url: `${repo}/commit/${id}`,
      totalLines: lines.length,
    };
    return Object.defineProperty(commit, 'lines', { value: lines });
  });
}

function renderStats(container, entries) {
  const items = container.selectAll('div').data(entries).join('div');
  items.selectAll('dt').data(([label]) => [label]).join('dt').text(label => label);
  items.selectAll('dd').data(([, value]) => [value]).join('dd').text(value => value);
}

function renderSummary(data, commits) {
  const fileLengths = d3.rollup(data, lines => d3.max(lines, line => line.line), line => line.file);
  const longestFile = d3.greatest(fileLengths, ([, length]) => length);
  const list = d3.select('#stats').append('dl').attr('class', 'stats');
  renderStats(list, [
    ['Lines of code', countFormat(data.length)],
    ['Commits', countFormat(commits.length)],
    ['Files', countFormat(fileLengths.size)],
    ['Languages', new Set(data.map(line => line.type)).size],
    ['Average line length', `${d3.format('.1f')(d3.mean(data, line => line.length))} characters`],
    ['Longest file', `${longestFile[0]} (${countFormat(longestFile[1])} lines)`],
  ]);
}

function updateSelection(selected) {
  const count = selected.length;
  d3.select('#selection-count').text(count
    ? `${count} commit${count === 1 ? '' : 's'} selected`
    : 'No commits selected');
  d3.select('#clear-selection').property('disabled', !count);
  d3.select('#selected-languages').property('hidden', !count);

  const lines = selected.flatMap(commit => commit.lines);
  const counts = d3.rollups(lines, group => group.length, line => line.type);
  const percentFormat = d3.format('.1~%');
  renderStats(d3.select('#language-breakdown'), d3.sort(counts, ([, size]) => -size)
    .map(([type, size]) => [
      { html: 'HTML', css: 'CSS', js: 'JavaScript' }[type] ?? type,
      `${countFormat(size)} lines (${percentFormat(size / lines.length)})`,
    ]));
}

const tooltip = d3.select('#commit-tooltip');

function moveTooltip(x, y) {
  const { width, height } = tooltip.node().getBoundingClientRect();
  tooltip.style('left', `${Math.max(8, Math.min(x + 12, innerWidth - width - 8))}px`)
    .style('top', `${Math.max(8, Math.min(y + 12, innerHeight - height - 8))}px`);
}

function showTooltip(commit, x, y) {
  tooltip.select('#commit-id').text(commit.id);
  tooltip.select('#commit-date').text(dateFormat(commit.day));
  tooltip.select('#commit-time').text(`${hourFormat(commit.clockTime)} (UTC${commit.timezone})`);
  tooltip.select('#commit-author').text(commit.author);
  tooltip.select('#commit-lines').text(countFormat(commit.totalLines));
  tooltip.property('hidden', false);
  moveTooltip(x, y);
}

function hideTooltip() {
  tooltip.property('hidden', true);
}

function renderScatterplot(commits) {
  const width = 640;
  const height = 390;
  const margin = { top: 22, right: 25, bottom: 50, left: 82 };
  const right = width - margin.right;
  const bottom = height - margin.bottom;
  const [first, last] = d3.extent(commits, commit => commit.day);
  const x = d3.scaleUtc()
    .domain([d3.utcDay.offset(first, -2), d3.utcDay.offset(last, 2)])
    .range([margin.left, right]);
  const y = d3.scaleLinear().domain([0, 24]).range([bottom, margin.top]);
  const radius = d3.scaleSqrt()
    .domain([0, d3.max(commits, commit => commit.totalLines)])
    .range([0, 19]);
  const hours = d3.range(0, 25, 3);
  const svg = d3.select('#commit-chart').append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'group').attr('aria-label', 'Scatterplot of portfolio commits')
    .attr('aria-describedby', 'commit-help');

  svg.append('g').attr('class', 'commit-grid')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickValues(hours).tickFormat(() => '').tickSize(margin.left - right));
  svg.append('g').attr('transform', `translate(0,${bottom})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(shortDate));
  svg.append('g').attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickValues(hours)
      .tickFormat(hour => `${String(hour).padStart(2, '0')}:00`));
  svg.append('text').attr('class', 'commit-axis-label')
    .attr('x', (margin.left + right) / 2).attr('y', height - 10).text('Commit date');
  svg.append('text').attr('class', 'commit-axis-label')
    .attr('transform', `translate(16,${(margin.top + bottom) / 2}) rotate(-90)`)
    .text('Local commit time');

  // The brush sits behind the dots, so the dots still receive hover and focus events.
  const brushLayer = svg.append('g').attr('class', 'commit-brush');
  const points = svg.append('g').attr('class', 'commit-dots').selectAll('a')
    .data(d3.sort(commits, commit => -commit.totalLines), commit => commit.id)
    .join('a')
    .attr('href', commit => commit.url).attr('target', '_blank').attr('rel', 'noopener')
    .attr('aria-label', commit => `Commit ${commit.id}, ${dateFormat(commit.day)}, ${hourFormat(commit.clockTime)}, ${commit.totalLines} lines`)
    .on('pointerenter', (event, commit) => showTooltip(commit, event.clientX, event.clientY))
    .on('pointermove', event => moveTooltip(event.clientX, event.clientY))
    .on('pointerleave blur', hideTooltip)
    .on('focus', (event, commit) => {
      const rect = event.currentTarget.getBoundingClientRect();
      showTooltip(commit, rect.right, rect.top);
    })
    .append('circle')
    .attr('cx', commit => x(commit.day))
    .attr('cy', commit => y(commit.hour))
    .attr('r', commit => Math.max(3, radius(commit.totalLines)));

  const brush = d3.brush().extent([[margin.left, margin.top], [right, bottom]])
    .on('start brush end', ({ selection }) => {
      hideTooltip();
      const selected = new Set();
      if (selection) {
        const [[x0, y0], [x1, y1]] = selection;
        for (const commit of commits) {
          const cx = x(commit.day);
          const cy = y(commit.hour);
          if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) selected.add(commit);
        }
      }
      points.classed('is-brushed', commit => selected.has(commit));
      updateSelection([...selected]);
    });
  brushLayer.call(brush);
  d3.select('#clear-selection').on('click', () => brushLayer.call(brush.move, null));
  d3.select(window).on('scroll.meta resize.meta', hideTooltip);
}

const status = d3.select('#meta-status');
try {
  const data = await d3.csv(new URL('./loc.csv', import.meta.url), line => ({
    ...line,
    line: Number(line.line),
    length: Number(line.length),
    depth: Number(line.depth),
  }));
  if (data.length) {
    const commits = processCommits(data);
    renderSummary(data, commits);
    renderScatterplot(commits);
    d3.select('#code-summary').property('hidden', false);
    d3.select('#commit-history').property('hidden', false);
    status.property('hidden', true);
  } else {
    status.text('No line data is available for this snapshot.');
  }
} catch (error) {
  status.text('Could not load the commit history. Open the portfolio through a web server and try again.');
  console.error(error);
}
