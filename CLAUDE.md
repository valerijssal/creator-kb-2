# Creator KB — Project State

## Repos
- **App**: `creator-kb-2` (Next.js, Vercel) — ~/Downloads/creator-kb 2
- **Content**: `creator-services-kb` (HTML files) — ~/Documents/GitHub/creator-services-kb
- **Images**: Cloudinary (cloud: djsloyzyb, folder: creator-kb/)
- **URL**: https://creator-services-knowledge-base.vercel.app

## Spaces
- creator-services → Confluence Export - Creator Services (main)
- underscore-talent → Confluence Export - Underscore Talent
- media-cube → Confluence Export - MediaCube
- content-licensing → Confluence Export - Content Licensing
- creator-services-project → Confluence Export - Creator Services Project

## Vercel Env Vars
KB_PASSWORD, PASS_ADMIN, PASS_RESTRICTED, PASS_EXECUTIVE, PASS_LIMITED, PASS_TEAM, GITHUB_TOKEN, GITHUB_APP_REPO

## Known Issues / To Do
- middleware.ts deprecation warning — rename to proxy.ts
- npm installs require sudo due to permissions on node_modules
- Cloudinary upload script re-uploads all spaces each run (no diffing)
- Footer URL typo fix attempt found no match — may already be correct

## Scripts (run from ~/Downloads/creator-kb 2)
- `node build-tree.mjs` — rebuild tree.json after doc changes
- `node extract-titles.mjs` — rebuild titles.json
- `CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=... node upload-attachments.mjs` — upload images
- After upload, run regex replacement script in creator-services-kb to update HTML URLs
