import fs from 'fs';
import path from 'path';

const spaces = [
  { slug: 'media-cube', folder: 'Confluence Export - MediaCube' },
  { slug: 'underscore-talent', folder: 'Confluence Export - Underscore Talent' },
  { slug: 'creator-services', folder: 'Confluence Export - Creator Services (main)' },
  { slug: 'creator-services-project', folder: 'Confluence Export - Creator Services Project' },
  { slug: 'content-licensing', folder: 'Confluence Export - Content Licensing' },
];

const contentRepo = path.join(process.env.HOME, 'Documents/GitHub/creator-services-kb');
const result = {};

for (const space of spaces) {
  const dir = path.join(contentRepo, space.folder);
  if (!fs.existsSync(dir)) { console.log('Missing:', dir); continue; }

  const pages = {};

  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(dir, file), 'utf8');

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/^TSP \+ Mediacube\s*:\s*/i, '').trim() : file;

    const breadcrumbLinks = [...html.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];
    const breadcrumbs = breadcrumbLinks
      .filter(m => m[1].endsWith('.html') && !m[1].includes('index'))
      .map(m => ({ href: m[1].replace(/^.*\//, ''), text: m[2].trim() }));

    const parent = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].href : null;

    pages[file] = { file, title, parent };
  }

  result[space.slug] = pages;
}

fs.writeFileSync('public/tree.json', JSON.stringify(result, null, 2));
console.log('Done — tree built for', Object.keys(result).length, 'spaces');
