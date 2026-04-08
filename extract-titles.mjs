import fs from 'fs';
import path from 'path';

const spaces = [
  'Confluence Export - MediaCube',
  'Confluence Export - Underscore Talent',
  'Confluence Export - Creator Services (main)',
  'Confluence Export - Creator Services Project',
  'Confluence Export - Content Licensing'
];

const titles = {};
const contentRepo = path.join(process.env.HOME, 'Documents/GitHub/creator-services-kb');

for (const space of spaces) {
  const dir = path.join(contentRepo, space);
  if (!fs.existsSync(dir)) { console.log('Missing:', dir); continue; }
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(dir, file), 'utf8');
    const match = html.match(/<title>([^<]+)<\/title>/i);
    if (match) {
      const title = match[1].replace(/^TSP \+ Mediacube\s*:\s*/i, '').trim();
      titles[file] = title;
    }
  }
}

fs.writeFileSync('public/titles.json', JSON.stringify(titles, null, 2));
console.log('Done —', Object.keys(titles).length, 'titles extracted');
