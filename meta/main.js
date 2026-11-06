import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Step 1.1: read loc.csv (one row per line of code)
async function loadData() {
  // d3.csv reads every value as a string, so the row function converts
  // the numeric and date columns into real numbers and Date objects
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line), // or just +row.line
    depth: Number(row.depth),
    length: Number(row.length),
    // date has no time, so pin it to midnight in the commit's own timezone
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

// Step 1.2: turn the per-line rows into one object per commit
function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit) // [[commitId, [lines...]], ...]
    .map(([commit, lines]) => {
      // every line in a commit shares the same author/date/time,
      // so read those from the first line
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;

      let ret = {
        id: commit,
        url: 'https://github.com/sop-xie/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        // hour of day as a decimal, e.g. 2:30 PM -> 14.5
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        // how many lines of the current code came from this commit
        totalLines: lines.length,
      };

      // keep the original line rows, but hidden: not enumerable (so it
      // doesn't clutter console.log or loops), and locked from changes
      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false,
        writable: false,
        configurable: false,
      });

      return ret;
    });
}

// Step 1.3: show summary stats as a <dl> of cards
function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  // each stat is a <div> holding its <dt> label and <dd> value,
  // so CSS can style every pair as one card (same as the homepage)
  // optional className lets one value be styled differently (e.g. smaller text)
  function addStat(labelHtml, valueHtml, className = null) {
    const card = dl.append('div');
    card.append('dt').html(labelHtml);
    card.append('dd').attr('class', className).html(valueHtml);
  }

  // total lines of code = number of rows in the CSV
  addStat('Total <abbr title="Lines of code">LOC</abbr>', data.length);

  // total commits = number of groups we made in processCommits
  addStat('Total commits', commits.length);

  // number of files: group lines by file, count the groups
  const fileLengths = d3.rollups(
    data,
    (v) => v.length, // lines per file
    (d) => d.file,
  ); // [[file, lineCount], ...]
  addStat('Files', fileLengths.length);

  // longest file: the [file, lineCount] pair with the most lines
  const [longestFile, longestFileLines] = d3.greatest(fileLengths, (d) => d[1]);
  // filenames are much wider than numbers, so this value gets smaller text
  addStat(
    'Longest file',
    `${longestFile}<small>${longestFileLines} lines</small>`,
    'text-value',
  );

  // average and longest line length, in characters
  addStat('Avg line length', d3.mean(data, (d) => d.length).toFixed(1));
  addStat('Longest line', d3.max(data, (d) => d.length));

  // busiest day: count commits per weekday, keep the day with the most
  const workByDay = d3.rollups(
    commits,
    (v) => v.length,
    (d) => d.datetime.toLocaleString('en', { weekday: 'long' }),
  );
  const [busiestDay] = d3.greatest(workByDay, (d) => d[1]);
  addStat('Busiest day', busiestDay, 'text-value');
}

// Step 2: scatterplot of commits, date (x) vs. time of day (y)
function renderScatterPlot(data, commits) {
  // Size of the drawing in SVG units; the viewBox scales it to fit the page
  const width = 1000;
  const height = 600;

  // Room around the plot for the axes (left is a bit wider than the lab's 20
  // so the "00:00" labels fit inside the SVG instead of hanging off the edge;
  // bottom is taller than the lab's 30 to fit the lowered month labels)
  const margin = { top: 10, right: 10, bottom: 40, left: 40 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  // Step 2.1: scales turn data values into pixel positions
  // x: time scale from the earliest to latest commit, rounded out to nice dates
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  // y: hours 0–24, flipped (bottom = midnight) because SVG y grows downward
  const yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  // Step 2.3: gridlines = a y-axis with no labels and ticks as wide as the plot.
  // Drawn first so they sit behind the dots and axes
  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);
  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  // Step 4.1/4.2: dot size shows how many lines the commit contributed.
  // scaleSqrt makes the circle's AREA (not radius) proportional to lines,
  // so a commit with 2x the lines looks 2x as big, not 4x
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([3, 20]);

  // Step 4.3: draw the biggest commits first so smaller dots end up on top
  // and can still be hovered (the minus sign sorts largest -> smallest)
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  // Step 2.1: one circle per commit
  const dots = svg.append('g').attr('class', 'dots');
  dots
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines)) // fill and opacity are set in style.css
    // Step 3: show the tooltip while the mouse is over a dot
    .on('mouseenter', (event, commit) => {
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', () => {
      updateTooltipVisibility(false);
    });

  // Step 2.2: axes (drawn last so they sit on top)
  const xAxis = d3.axisBottom(xScale);
  // label hours as times: 0 -> "00:00", 24 -> "00:00" (via % 24)
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  const xAxisGroup = svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  // Month ticks (e.g. "November") would collide with the day labels next to
  // them, so give them a longer tick line and drop their label below the days.
  // A tick is a month start if rounding it down to its month changes nothing
  xAxisGroup
    .selectAll('.tick')
    .filter((d) => +d3.timeMonth(d) === +d)
    .classed('month-tick', true) // bold text, set in style.css
    .call((tick) => {
      tick.select('line').attr('y2', 18); // normal ticks are 6 long
      tick.select('text').attr('y', 21); // normal labels sit at 9
    });

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);
}

// Step 3.1: fill the tooltip with one commit's info
function renderTooltipContent(commit) {
  // nothing to show (e.g. an empty object), so leave the tooltip as is
  if (Object.keys(commit).length === 0) return;

  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  link.href = commit.url;
  link.textContent = commit.id;
  // e.g. "Friday, October 2, 2026"
  date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
  // e.g. "8:21 PM"
  time.textContent = commit.datetime?.toLocaleString('en', { timeStyle: 'short' });
  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

// Step 3.3: show/hide the tooltip with the HTML `hidden` attribute
// (CSS fades it in and out instead of popping)
function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

// Step 3.4: move the tooltip to the mouse. clientX/clientY are measured from
// the top-left of the window, which matches the tooltip's position: fixed
function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  // small offset so the tooltip sits beside the cursor instead of under it
  tooltip.style.left = `${event.clientX + 12}px`;
  tooltip.style.top = `${event.clientY + 12}px`;
}

let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
