import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

// Load the same project data the Projects page uses (path is relative to the home page)
const projects = await fetchJSON('./lib/projects.json');

// Only show the first 3 projects on the home page
const latestProjects = projects.slice(0, 3);

// The element the project articles will be rendered into
const projectsContainer = document.querySelector('.projects');

// h3, since these sit under a "Latest Projects" h2
renderProjects(latestProjects, projectsContainer, 'h3');

// Load my live GitHub profile stats
const githubData = await fetchGitHubData('sop-xie');

// The element the stats will be rendered into
const profileStats = document.querySelector('#profile-stats');

// githubData is undefined if the request failed (e.g. rate limit), so skip it then
if (profileStats && githubData) {
  profileStats.innerHTML = `
    <h2 class="section-title">My GitHub Stats</h2>
    <dl>
      <div><dt>Public Repos</dt><dd>${githubData.public_repos}</dd></div>
      <div><dt>Public Gists</dt><dd>${githubData.public_gists}</dd></div>
      <div><dt>Followers</dt><dd>${githubData.followers}</dd></div>
      <div><dt>Following</dt><dd>${githubData.following}</dd></div>
    </dl>
  `;
}
