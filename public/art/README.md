# Henyard art, versions 2–3

- Active asset: `public/art/farm-atlas-v2.png`, 1254 × 1254, PNG with alpha.
- Created by the built-in image generation tool, editing the project’s first atlas. The user’s screenshot is not embedded in the game.
- Distinctive identity: apricot hen with teal neckerchief, purple fruit, square produce crate, fabric-lined willow basket, round sun/moon pressure plates, teal-roofed home.
- Runtime SVG crop viewports with unique clip paths live in `src/app/_components/sprite.tsx`; no raster post-editing was used. Historical internal aliases (`barrel`, `corn`, `berries`, `sign`) map to crate, wheat, plums, and home.
- Previous atlas remains as a source asset; the browser loads v2 plus the v3 expansion below.

## Version 2 generation brief

Edit the existing transparent 4 × 4 pixel sprite atlas into an original apricot, moss and dusty teal farm identity. In reading order: ginger mother hen with cream freckled wing and teal neckerchief; butter-cream chick with russet tuft and teal collar; blue-purple plums with leaves; speckled cream egg; empty willow basket with teal lining; matching basket with egg; square produce crate with sage bands and leaf emblem; mossy mauve-gray stone; closed arched lattice garden gate with teal hinges; matching open gate; raised round terracotta sun pressure tile; depressed matching tile; tied wheat bundle; magical growing sprout with gold leaves; small teal-roofed cream hen house; clover with lavender flowers. Crisp 16-bit pixel clusters, chestnut outlines, elevated side view, contact shadows, generous transparent padding; no scene, labels, UI, watermark or text. Preserve alpha and keep all sprites individually usable.

## Original generation record

# Farm sprite atlas

- Final project asset: `public/art/farm-atlas.png` (1254 × 1254, PNG with alpha, approximately 1.1 MB).
- Created with the built-in `image_gen` tool; no external image API or CLI fallback.
- Generated for this project from a text specification informed by the user's farm-puzzle reference image. The reference screenshot is not embedded in the application.
- Runtime crops are in `src/app/_components/sprite.tsx`. Each crop uses an SVG viewport over the original PNG, so adjacent atlas pixels are excluded without modifying the source raster. The image is shared and browser-cached.
- Terrain, fence rails, pressure-state markers, directional hints and UI are code-native; characters and illustrated objects use this atlas.

## Final generation prompt

Use case: stylized-concept. Asset type: production sprite atlas for a cozy chicken farm grid puzzle game. Create ONE square transparent PNG sprite atlas, perfectly regular 4 columns by 4 rows, each cell exactly 1/4 of image width and height. Each sprite centered inside its own square with at least 12% transparent padding, no overlap. Original detailed 16-bit pixel art, visible crisp square pixel clusters, warm dark brown outlines, limited muted olive/golden/straw palette, cream white hen with red comb, buttery yellow chicks, slightly elevated SIDE VIEW like classic rural handheld puzzle games, light from upper left, small contact shadows. No labels, no text, no grid lines, no scenery background. EXACT cell contents in reading order: Row 1: (1) plump white mother hen facing RIGHT, full body feet tail red comb, (2) one cute yellow baby chick facing RIGHT full body, (3) cluster of three ripe red berries with tiny green leaf, (4) single cream chicken egg upright. Row 2: (1) empty circular golden straw nest, (2) same straw nest containing one cream egg, (3) squat wooden barrel with two dark metal bands, (4) small gray fieldstone. Row 3: (1) CLOSED wooden farm fence gate front view two vertical posts with two horizontal rails, (2) OPEN wooden gate same posts opening in center, (3) square gray stone pressure plate raised with a small terracotta diamond mark in center, (4) same square gray pressure plate pressed down with terracotta diamond mark. Row 4: (1) small yellow corn cob with green husk, (2) sunflower, (3) simple wooden direction sign pointing right on short post, (4) tiny tuft of olive green grass with two small cream daisies. Keep all sixteen objects distinct, individually usable on grass tiles. The hen and chick must look expressive and natural like farm animals, not a top-down circle. Crisp pixel art, no smooth vector artwork, no text, no watermark.

## Version 3 expansion atlas

- Active additional asset: `public/art/farm-expansion-v3.png`, 1254 × 1254 PNG with alpha.
- Generated with the built-in image generation tool, referencing v2 to keep the apricot hen and teal scarf consistent. No raster post-editing; independent SVG viewports crop the original file at runtime.
- Sixteen sprites: bell idle/ringing, lily bridge/ripple, bell gate closed/open, happy hen/chick, six chapter keepsakes, sparkles, feather. The game loads v2 and this additional atlas. Earlier atlas remains historical.

### Exact generation prompt

Create a NEW expansion sprite atlas for the cozy pixel farm puzzle Henyard, matching the original reference atlas's honey-apricot hen with cream freckled wing and teal neckerchief, warm brown pixel outlines, detailed chunky pixel shading, gentle 3/4 game perspective. This is an additional atlas, NOT a copy of the reference grid. Exactly 4 columns x 4 rows on a fully transparent square canvas, evenly spaced equal square cells, all artwork entirely inside each cell with at least 15% transparent margins, no overlap. Every sprite complete and isolated, no text, letters, captions, borders or grid lines. Row 1: (1) little freestanding wooden arch holding a bronze flower wind chime with sun emblem and teal ribbon, idle (2) same wind chime ringing, tilted bell, small gold sparkles (3) floating broad green lily pad stepping bridge, two small tied bamboo slats across center and pink bud on edge (4) empty blue water ripple with two tiny lily leaf fragments, no bridge. Row 2: (1) compact arched wooden gate closed with bronze bell emblem (2) same gate open with bronze bell emblem (3) apricot hen exactly matching reference face/body/teal scarf, eyes happily closed, both wings raised in celebration (4) butter yellow chick wearing teal scarf joyfully hopping with little feet visible. Row 3: six unique chapter souvenir stickers start here: (1) teal watering can holding tiny daisies (2) tiny decorative wooden garden gate with ivy and cream bow (3) straw basket of speckled eggs with lavender ribbon (4) little red-brown toy sailboat with teal sail. Row 4: (1) ornamental bronze wind chime with flower and teal ribbon (2) pink lotus lantern on green lily leaf (3) tiny cream-gold four point sparkle cluster for celebration particles (4) fluffy cream feather with gold tip. Warm whimsical original game assets, no photorealism, consistent pixel art, strong silhouettes readable at 40 pixels. Preserve reference identity but only requested new sprites.
