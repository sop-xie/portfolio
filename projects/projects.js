import { fetchJSON, renderProjects } from '../global.js';

// Load the project data (path is relative to this page, projects/index.html)
const projects = await fetchJSON('../lib/projects.json');

// The element the project articles will be rendered into
const projectsContainer = document.querySelector('.projects');

renderProjects(projects, projectsContainer, 'h2');

// Show how many projects there are in the page heading
const projectsTitle = document.querySelector('.projects-title');
projectsTitle.textContent = `${projects.length} Projects`;
