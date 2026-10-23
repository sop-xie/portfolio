console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Step 2 (replaced by the automatic nav below)
// let navLinks = $$("nav a");
//
// let currentLink = navLinks.find(
//   (a) => a.host === location.host && a.pathname === location.pathname,
// );
//
// currentLink?.classList.add('current');

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/sop-xie', title: 'GitHub' },
];

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  // Local server
  : "/portfolio/";       // GitHub Pages repo name

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  if (!url.startsWith('http')) {
    url = BASE_PATH + url;
  }

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;

  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add('current');
  }

  if (a.host !== location.host) {
    a.target = '_blank';
  }

  nav.append(a);
}

// Is the OS currently in dark mode? (same media query CSS uses)
let isDark = matchMedia('(prefers-color-scheme: dark)').matches;

document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic (${isDark ? 'Dark' : 'Light'})</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`,
);

let select = document.querySelector('.color-scheme select');

// Apply a color scheme to the whole page and make the dropdown show it
function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty('color-scheme', colorScheme);
  select.value = colorScheme;
}

// On page load: reuse the choice saved last time, if there is one
if ('colorScheme' in localStorage) {
  setColorScheme(localStorage.colorScheme);
}

// When the user picks a new option: apply it and remember it
select.addEventListener('input', function (event) {
  console.log('color scheme changed to', event.target.value);
  setColorScheme(event.target.value);
  localStorage.colorScheme = event.target.value;
});

// Contact form: build the mailto: link ourselves so spaces become %20, not +
let form = document.querySelector('form');

form?.addEventListener('submit', function (event) {
  // Stop the browser from submitting the form its own way
  event.preventDefault();

  let data = new FormData(form);
  let params = [];

  for (let [name, value] of data) {
    params.push(name + '=' + encodeURIComponent(value));
  }

  let url = form.action + '?' + params.join('&');
  location.href = url;
});

// Load a JSON file (or API response) and return it as JS data
export async function fetchJSON(url) {
  try {
    // Wait for the network request to finish
    const response = await fetch(url);

    // fetch only throws on network errors, so check for 404 etc. ourselves
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    // Wait for the body to be parsed from JSON text into an array/object
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

// Get a user's public profile info (repos, followers, ...) from the GitHub API
export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}

// Build one <article> per project inside containerElement
export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  // Only allow real heading tags (h1–h6); anything else falls back to h2
  if (!/^h[1-6]$/.test(headingLevel)) {
    console.warn(`Invalid heading level "${headingLevel}", using h2 instead`);
    headingLevel = 'h2';
  }

  // Clear out whatever was there so we don't end up with duplicates
  containerElement.innerHTML = '';

  for (let project of projects) {
    let article = document.createElement('article');

    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${project.image}" alt="${project.title}">
      <p>${project.description}</p>
    `;

    containerElement.appendChild(article);
  }
}
