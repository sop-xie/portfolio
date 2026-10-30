import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Load the project data (path is relative to this page, projects/index.html)
const projects = await fetchJSON('../lib/projects.json');

// The element the project articles will be rendered into
const projectsContainer = document.querySelector('.projects');

renderProjects(projects, projectsContainer, 'h2');

// Show how many projects there are in the page heading
const projectsTitle = document.querySelector('.projects-title');
projectsTitle.textContent = `${projects.length} Projects`;

// A function that turns start/end angles into an SVG path string;
// inner radius 0 means a solid shape (anything bigger would make a donut)
let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

// d3.pie() works out each slice's start and end angles from the data;
// .value() tells it which field of each object holds the slice's size
let sliceGenerator = d3.pie().value((d) => d.value);

// A color scale: a function that takes a label and returns a color from this list.
// It remembers which color each label got, so a year keeps its color when searching
let colors = d3.scaleOrdinal([
  '#ccb8f1', // lavender
  '#df97c5', // pink
  '#7c7fc0', // periwinkle
  '#5fabbb', // teal-blue
  '#8d6199', // plum
  '#bed3ec', // pale sky blue
]);

// Which slice is selected; -1 is the convention for "none"
let selectedIndex = -1;

// Draw the pie chart and legend for whichever projects are passed in
function renderPieChart(projectsGiven) {
  // Group the projects by year and count each group, giving [[year, count], ...]
  let rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );

  // Convert to the shape the chart expects: each slice's size and what it stands for
  let data = rolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  let arcData = sliceGenerator(data);

  // Turn each slice's angles into an SVG path string
  let arcs = arcData.map((d) => arcGenerator(d));

  // Clear the previous chart and legend so they don't pile up on each redraw
  let svg = d3.select('svg');
  svg.selectAll('path').remove();
  let legend = d3.select('.legend');
  legend.selectAll('li').remove();

  // Add one <path> per slice to the chart, each with its own color
  arcs.forEach((arc, idx) => {
    svg
      .append('path')
      .attr('d', arc)
      .attr('fill', colors(data[idx].label))
      .on('click', () => {
        // Clicking the selected slice deselects it; any other slice becomes selected
        selectedIndex = selectedIndex === idx ? -1 : idx;

        // Paths and legend items are in the same order, so the same index marks both
        svg
          .selectAll('path')
          .attr('class', (_, i) => (i === selectedIndex ? 'selected' : null));
        legend
          .selectAll('li')
          .attr('class', (_, i) =>
            i === selectedIndex ? 'legend-item selected' : 'legend-item',
          );

        // Show every project if nothing is selected, or just the selected year's
        if (selectedIndex === -1) {
          renderProjects(projects, projectsContainer, 'h2');
        } else {
          let selectedYear = data[selectedIndex].label;
          let yearProjects = projects.filter(
            (project) => project.year === selectedYear,
          );
          renderProjects(yearProjects, projectsContainer, 'h2');
        }
      });
  });

  // Add one <li> per slice to the legend; --color hands the slice's color to the CSS
  data.forEach((d) => {
    legend
      .append('li')
      .attr('class', 'legend-item')
      .attr('style', `--color:${colors(d.label)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
}

// Draw the chart for all the projects when the page first loads
renderPieChart(projects);

// Holds what the user has typed in the search bar (empty means show everything)
let query = '';

let searchInput = document.querySelector('.searchBar');

// 'input' fires on every keystroke, so the results update as the user types
searchInput.addEventListener('input', (event) => {
  // Remember the current search text
  query = event.target.value;

  // Keep only the projects with that text in any field, ignoring upper/lower case
  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });

  // Redraw the project list, chart and legend with just those projects
  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});
