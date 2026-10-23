import { fetchJSON, renderProjects } from './global.js';

// Load the same project data the Projects page uses (path is relative to the home page)
const projects = await fetchJSON('./lib/projects.json');

// Only show the first 3 projects on the home page
const latestProjects = projects.slice(0, 3);

// The element the project articles will be rendered into
const projectsContainer = document.querySelector('.projects');

// h3, since these sit under a "Latest Projects" h2
renderProjects(latestProjects, projectsContainer, 'h3');
