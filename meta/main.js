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

let data = await loadData();
let commits = processCommits(data);

// temporary: check the commits array in the browser console (removed in Step 1.3)
console.log(commits);
