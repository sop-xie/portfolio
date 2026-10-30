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

// What the pie chart represents: each slice's size and what it stands for
let data = [
  { value: 1, label: 'apples' },
  { value: 2, label: 'oranges' },
  { value: 3, label: 'mangos' },
  { value: 4, label: 'pears' },
  { value: 5, label: 'limes' },
  { value: 5, label: 'cherries' },
];

// d3.pie() works out each slice's start and end angles from the data;
// .value() tells it which field of each object holds the slice's size
let sliceGenerator = d3.pie().value((d) => d.value);
let arcData = sliceGenerator(data);

// Turn each slice's angles into an SVG path string
let arcs = arcData.map((d) => arcGenerator(d));

// A color scale: a function that takes an index and returns a color from this list
let colors = d3.scaleOrdinal([
  '#cfb4ff', // lavender
  '#ec8ccb', // pink
  '#797bd2', // periwinkle
  '#3cafc4', // teal-blue
  '#9459a5', // plum
  '#b8d4f5', // pale sky blue
]);

// Add one <path> per slice to the chart, each with its own color
arcs.forEach((arc, idx) => {
  d3.select('svg').append('path').attr('d', arc).attr('fill', colors(idx));
});

// Add one <li> per slice to the legend; --color hands the slice's color to the CSS
let legend = d3.select('.legend');
data.forEach((d, idx) => {
  legend
    .append('li')
    .attr('class', 'legend-item')
    .attr('style', `--color:${colors(idx)}`)
    .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
});
