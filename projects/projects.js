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

// The numbers the pie chart represents (1 out of 3, and 2 out of 3)
let data = [1, 2];

// d3.pie() works out each slice's start and end angles from the data
let sliceGenerator = d3.pie();
let arcData = sliceGenerator(data);

// Turn each slice's angles into an SVG path string
let arcs = arcData.map((d) => arcGenerator(d));

let colors = ['gold', 'purple'];

// Add one <path> per slice to the chart, each with its own color
arcs.forEach((arc, idx) => {
  d3.select('svg').append('path').attr('d', arc).attr('fill', colors[idx]);
});
