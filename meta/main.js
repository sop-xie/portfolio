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
  function addStat(labelHtml, valueHtml) {
    const card = dl.append('div');
    card.append('dt').html(labelHtml);
    card.append('dd').html(valueHtml);
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
  addStat('Longest file', `${longestFile}<small>${longestFileLines} lines</small>`);

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
  addStat('Busiest day', busiestDay);
}

// Step 2: scatterplot of commits, date (x) vs. time of day (y)
function renderScatterPlot(data, commits) {
  // Size of the drawing in SVG units; the viewBox scales it to fit the page
  const width = 1000;
  const height = 600;

  // Room around the plot for the axes (left is a bit wider than the lab's 20
  // so the "00:00" labels fit inside the SVG instead of hanging off the edge)
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
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

  // Step 2.1: one circle per commit
  const dots = svg.append('g').attr('class', 'dots');
  dots
    .selectAll('circle')
    .data(commits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', 5); // fill color is set in style.css

  // Step 2.2: axes (drawn last so they sit on top)
  const xAxis = d3.axisBottom(xScale);
  // label hours as times: 0 -> "00:00", 24 -> "00:00" (via % 24)
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);
}

let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
