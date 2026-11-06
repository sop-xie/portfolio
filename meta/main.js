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

let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);
