import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

cloudinary.config({
  cloud_name: 'djsloyzyb',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DESKTOP = path.join(process.env.HOME, 'Desktop');
const CONTENT_REPO = path.join(process.env.HOME, 'Documents/GitHub/creator-services-kb');

const SPACE_FOLDERS = [
  { space: 'creator-services', folder: 'Creator Services (main) - Confluence attachments' },
  { space: 'media-cube', folder: 'Media Cube - Confluence - attachments' },
  { space: 'underscore-talent', folder: 'Underscore - Confluence - attachments' },
  { space: 'content-licensing', folder: 'Licensing - Confluence - attachments ' },
  { space: 'creator-services-project', folder: 'Creator Services Project - Confluence - attachments' },
];

const SPACE_DIRS = {
  'creator-services': 'Confluence Export - Creator Services (main)',
  'media-cube': 'Confluence Export - MediaCube',
  'underscore-talent': 'Confluence Export - Underscore Talent',
    'content-licensing': 'Confluence Export - Content Licensing',
    'creator-services-project': 'Confluence Export - Creator Services Project',
};

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
const urlMap = {};
let uploaded = 0;
let errors = 0;

function getAllImages(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...getAllImages(full));
    else if (IMAGE_EXTS.includes(path.extname(entry.name).toLowerCase())) results.push(full);
  }
  return results;
}

async function uploadImage(filePath, publicId) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      overwrite: false,
      resource_type: 'image',
    });
    return result.secure_url;
  } catch (err) {
    if (err?.http_code === 400) {
      return 'https://res.cloudinary.com/djsloyzyb/image/upload/' + publicId;
    }
    throw err;
  }
}

async function main() {
  console.log('Starting upload...');

  for (const { space, folder } of SPACE_FOLDERS) {
    const folderPath = path.join(DESKTOP, folder);
    if (!fs.existsSync(folderPath)) { console.log('Skipping missing:', folder); continue; }
    const images = getAllImages(folderPath);
    console.log('\n' + space + ': ' + images.length + ' images');

    for (const imgPath of images) {
      const filename = path.basename(imgPath);
      const publicId = 'creator-kb/' + space + '/' + filename.replace(/\.[^.]+$/, '');
      try {
        const url = await uploadImage(imgPath, publicId);
        urlMap[filename] = url;
        uploaded++;
        if (uploaded % 100 === 0) console.log('  Uploaded ' + uploaded + '...');
      } catch (err) {
        console.error('  Error: ' + filename + ' - ' + err.message);
        errors++;
      }
    }
  }

  fs.writeFileSync('url-map.json', JSON.stringify(urlMap, null, 2));
  console.log('\nUpload done. Uploaded: ' + uploaded + ', Errors: ' + errors);

  console.log('\nUpdating HTML files...');
  let htmlUpdated = 0;

  for (const [space, dir] of Object.entries(SPACE_DIRS)) {
    const spaceDir = path.join(CONTENT_REPO, dir);
    if (!fs.existsSync(spaceDir)) continue;
    for (const file of fs.readdirSync(spaceDir).filter(f => f.endsWith('.html'))) {
      const filePath = path.join(spaceDir, file);
      let html = fs.readFileSync(filePath, 'utf8');
      let changed = false;
      for (const [filename, url] of Object.entries(urlMap)) {
        if (html.includes(filename)) {
          html = html.split('"' + filename + '"').join('"' + url + '"');
          html = html.split("'" + filename + "'").join("'" + url + "'");
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(filePath, html);
        htmlUpdated++;
      }
    }
  }

  console.log('Updated ' + htmlUpdated + ' HTML files');
}

main().catch(console.error);
