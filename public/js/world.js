// ============================================================
// WORLD.JS - Tiles, Map, Sprites, Palettes
// Pokemon GBC-style world data
// ============================================================

// --- Color Palettes ---
export const PALETTES = {
  // Nature
  grass1:     '#88c070',
  grass2:     '#68a850',
  grass3:     '#507840',
  path1:      '#d8c890',
  path2:      '#c0a868',
  pathEdge:   '#a89050',
  tree1:      '#306830',
  tree2:      '#184818',
  treeTrunk:  '#705030',
  water1:     '#5090d0',
  water2:     '#3870b0',
  flower1:    '#f04040',
  flower2:    '#f0d040',

  // Buildings
  roofRed:    '#c83838',
  roofRedD:   '#a02828',
  roofBlue:   '#3858a8',
  roofBlueD:  '#283878',
  roofPurple: '#8838a8',
  roofPurpleD:'#682888',
  roofBrown:  '#987048',
  roofBrownD: '#785838',
  roofOrange: '#d87030',
  roofOrangeD:'#b85820',
  wall:       '#f0e8d0',
  wallShade:  '#d0c8a8',
  door:       '#705030',
  doorFrame:  '#504020',
  window:     '#88c0e8',
  windowFrame:'#506878',
  sign:       '#c8b080',
  signPost:   '#806040',

  // UI
  black:      '#181818',
  white:      '#f8f8f8',
  darkGray:   '#484848',

  // Agent palettes (indexed by type)
  agentSkin:  '#f8c898',
  agentSkinS: '#d8a070',
  agentEye:   '#282828',
};

export const AGENT_COLORS = {
  'general-purpose': { hat: '#e03030', hatD: '#b02020', shirt: '#e03030', shirtD: '#b02020', pants: '#3030a0', shoes: '#282828' },
  'Explore':         { hat: '#3050d0', hatD: '#2038a0', shirt: '#3050d0', shirtD: '#2038a0', pants: '#383838', shoes: '#282828' },
  'Plan':            { hat: '#30a050', hatD: '#208038', shirt: '#30a050', shirtD: '#208038', pants: '#584828', shoes: '#282828' },
  'test-runner':     { hat: '#d07020', hatD: '#b05818', shirt: '#d07020', shirtD: '#b05818', pants: '#303060', shoes: '#282828' },
  'claude-code-guide':{ hat: '#c830c8', hatD: '#a020a0', shirt: '#c830c8', shirtD: '#a020a0', pants: '#383838', shoes: '#282828' },
  'default':         { hat: '#808080', hatD: '#606060', shirt: '#808080', shirtD: '#606060', pants: '#484848', shoes: '#282828' },
};

// --- Tile Types ---
export const TILES = {
  GRASS: 0,
  PATH: 1,
  TREE: 2,
  WATER: 3,
  FENCE: 4,
  ROOF_RED: 5,
  WALL: 6,
  DOOR: 7,
  ROOF_BLUE: 8,
  ROOF_PURPLE: 9,
  ROOF_BROWN: 10,
  ROOF_ORANGE: 11,
  SIGN: 12,
  FLOWER: 13,
  WINDOW: 14,
  GRASS_DARK: 15,
};

export const WALKABLE = new Set([
  TILES.GRASS, TILES.PATH, TILES.DOOR, TILES.FLOWER, TILES.GRASS_DARK
]);

export const TILE_SIZE = 32;
export const MAP_W = 24;
export const MAP_H = 18;
export const SCALE = 2; // 2x native resolution for crisp rendering

// --- Map Data (24x18) ---
// T=tree G=grass P=path R=roof W=wall D=door S=sign F=flower
const T = TILES.TREE, G = TILES.GRASS, P = TILES.PATH, W = TILES.WALL,
      D = TILES.DOOR, S = TILES.SIGN, Fl = TILES.FLOWER, GD = TILES.GRASS_DARK,
      Wi = TILES.WINDOW, Fe = TILES.FENCE;

// Building roofs (specific per building)
const R1 = TILES.ROOF_BLUE;    // Prof Lab (Plan) - blue
const R2 = TILES.ROOF_BROWN;   // Library (Explore) - brown
const R3 = TILES.ROOF_RED;     // Pokemon Center (idle) - red
const R4 = TILES.ROOF_PURPLE;  // Code Lab (general) - purple
const R5 = TILES.ROOF_ORANGE;  // Battle Arena (test) - orange

export const MAP = [
  // 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23
  [ T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T], // 0
  [ T, G, G, Fl,G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, Fl,G, G, T], // 1
  [ T, G,R1,R1,R1,R1,R1, G, G, P, G, G, G, G, P, G, G,R2,R2,R2,R2,R2, G, T], // 2
  [ T, G, W,Wi, W,Wi, W, G, G, P, G, Fl,Fl, G, P, G, G, W,Wi, W,Wi, W, G, T], // 3
  [ T, G, W, W, D, W, W, G, G, P, G, G, G, G, P, G, G, W, W, D, W, W, G, T], // 4
  [ T, G, G, G, P, G, G, G, G, P, G, G, G, G, P, G, G, G, G, P, G, G, G, T], // 5
  [ T, G, G, G, P, G, G, G, G, P, G, G, G, G, P, G, G, G, G, P, G, G, G, T], // 6
  [ T, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, T], // 7
  [ T, G, G, G, G, G, G, G, G,R3,R3,R3,R3,R3,R3, G, G, G, G, G, G, G, G, T], // 8
  [ T, G, Fl,G, G, S, G, G, G, W,Wi, W, W,Wi, W, G, G, G, S, G, G,Fl, G, T], // 9
  [ T, P, P, P, P, P, P, P, P, W, W, D, D, W, W, P, P, P, P, P, P, P, P, T], //10
  [ T, G, G, G, P, G, G, G, G, G, G, P, P, G, G, G, G, G, G, P, G, G, G, T], //11
  [ T, G, G, G, P, G, G, G, G, G, G, P, P, G, G, G, G, G, G, P, G, G, G, T], //12
  [ T, G,R4,R4,R4,R4,R4, G, G, P, P, P, P, P, P, G, G,R5,R5,R5,R5,R5, G, T], //13
  [ T, G, W,Wi, W,Wi, W, G, G, P, G, G, G, G, P, G, G, W,Wi, W,Wi, W, G, T], //14
  [ T, G, W, W, D, W, W, G, G, P, G, G, G, G, P, G, G, W, W, D, W, W, G, T], //15
  [ T, G, G,Fl, P, G, G, G, G, P, G,Fl, G,Fl, P, G, G, G, G, P,Fl, G, G, T], //16
  [ T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T], //17
];

// --- Building definitions ---
export const BUILDINGS = {
  'Plan':            { name: "PROF'S LAB",    door: {x:4,  y:4},  workArea: {x:4,  y:3},  color: 'roofBlue' },
  'Explore':         { name: 'LIBRARY',       door: {x:19, y:4},  workArea: {x:19, y:3},  color: 'roofBrown' },
  'idle':            { name: 'POKE CENTER',   door: {x:11, y:10}, workArea: {x:11, y:9},  color: 'roofRed' },
  'general-purpose': { name: 'CODE LAB',      door: {x:4,  y:15}, workArea: {x:4,  y:14}, color: 'roofPurple' },
  'test-runner':     { name: 'BATTLE ARENA',  door: {x:19, y:15}, workArea: {x:19, y:14}, color: 'roofOrange' },
};

// Spawn point (in front of Pokemon Center)
export const SPAWN_POINT = { x: 11, y: 11 };

// --- Tile rendering functions ---
const tileCache = new Map();

function drawGrassTile(ctx, x, y) {
  ctx.fillStyle = PALETTES.grass1;
  ctx.fillRect(x, y, 32, 32);
  // Grass tufts
  ctx.fillStyle = PALETTES.grass2;
  ctx.fillRect(x+4, y+8, 4, 4);
  ctx.fillRect(x+20, y+16, 4, 4);
  ctx.fillRect(x+12, y+24, 4, 4);
}

function drawDarkGrassTile(ctx, x, y) {
  ctx.fillStyle = PALETTES.grass2;
  ctx.fillRect(x, y, 32, 32);
  ctx.fillStyle = PALETTES.grass3;
  ctx.fillRect(x+6, y+6, 4, 4);
  ctx.fillRect(x+22, y+18, 4, 4);
  ctx.fillRect(x+14, y+26, 4, 4);
}

function drawPathTile(ctx, x, y) {
  ctx.fillStyle = PALETTES.path1;
  ctx.fillRect(x, y, 32, 32);
  // Subtle texture
  ctx.fillStyle = PALETTES.path2;
  ctx.fillRect(x+6, y+4, 4, 2);
  ctx.fillRect(x+18, y+14, 6, 2);
  ctx.fillRect(x+10, y+24, 4, 2);
  ctx.fillRect(x+24, y+28, 4, 2);
}

function drawTreeTile(ctx, x, y) {
  // Trunk
  ctx.fillStyle = PALETTES.treeTrunk;
  ctx.fillRect(x+12, y+20, 8, 12);
  // Leaves (round canopy)
  ctx.fillStyle = PALETTES.tree1;
  ctx.fillRect(x+4, y+4, 24, 20);
  ctx.fillRect(x+8, y+0, 16, 4);
  ctx.fillRect(x+0, y+8, 32, 12);
  // Leaf highlights
  ctx.fillStyle = PALETTES.tree2;
  ctx.fillRect(x+6, y+12, 8, 6);
  ctx.fillRect(x+20, y+6, 6, 8);
}

function drawWaterTile(ctx, x, y, frame) {
  ctx.fillStyle = PALETTES.water1;
  ctx.fillRect(x, y, 32, 32);
  ctx.fillStyle = PALETTES.water2;
  const off = ((frame || 0) % 8) * 2;
  ctx.fillRect(x + off, y+6, 8, 2);
  ctx.fillRect(x + (off+8)%32, y+18, 10, 2);
  ctx.fillRect(x + (off+4)%32, y+28, 6, 2);
}

function drawFenceTile(ctx, x, y) {
  ctx.fillStyle = PALETTES.grass1;
  ctx.fillRect(x, y, 32, 32);
  ctx.fillStyle = PALETTES.path2;
  // Posts
  ctx.fillRect(x+2, y+8, 6, 20);
  ctx.fillRect(x+24, y+8, 6, 20);
  // Rails
  ctx.fillRect(x, y+12, 32, 4);
  ctx.fillRect(x, y+22, 32, 4);
  // Post tops
  ctx.fillStyle = PALETTES.pathEdge;
  ctx.fillRect(x+2, y+6, 6, 2);
  ctx.fillRect(x+24, y+6, 6, 2);
}

function drawRoofTile(ctx, x, y, color) {
  const c = PALETTES[color] || PALETTES.roofRed;
  const cd = PALETTES[color + 'D'] || PALETTES.roofRedD;
  ctx.fillStyle = c;
  ctx.fillRect(x, y, 32, 32);
  // Roof lines
  ctx.fillStyle = cd;
  ctx.fillRect(x, y+6, 32, 4);
  ctx.fillRect(x, y+16, 32, 4);
  ctx.fillRect(x, y+26, 32, 4);
  // Top edge
  ctx.fillStyle = PALETTES.black;
  ctx.fillRect(x, y, 32, 2);
}

function drawWallTile(ctx, x, y) {
  ctx.fillStyle = PALETTES.wall;
  ctx.fillRect(x, y, 32, 32);
  ctx.fillStyle = PALETTES.wallShade;
  ctx.fillRect(x, y+30, 32, 2);
  ctx.fillRect(x+30, y, 2, 32);
}

function drawWindowTile(ctx, x, y) {
  ctx.fillStyle = PALETTES.wall;
  ctx.fillRect(x, y, 32, 32);
  // Window frame
  ctx.fillStyle = PALETTES.windowFrame;
  ctx.fillRect(x+6, y+6, 20, 20);
  // Glass
  ctx.fillStyle = PALETTES.window;
  ctx.fillRect(x+8, y+8, 16, 16);
  // Cross bars
  ctx.fillStyle = PALETTES.windowFrame;
  ctx.fillRect(x+14, y+8, 4, 16);
  ctx.fillRect(x+8, y+14, 16, 4);
  // Wall bottom
  ctx.fillStyle = PALETTES.wallShade;
  ctx.fillRect(x, y+30, 32, 2);
}

function drawDoorTile(ctx, x, y) {
  ctx.fillStyle = PALETTES.wall;
  ctx.fillRect(x, y, 32, 32);
  // Door frame
  ctx.fillStyle = PALETTES.doorFrame;
  ctx.fillRect(x+6, y+4, 20, 28);
  // Door
  ctx.fillStyle = PALETTES.door;
  ctx.fillRect(x+8, y+6, 16, 26);
  // Handle
  ctx.fillStyle = PALETTES.path1;
  ctx.fillRect(x+18, y+18, 4, 4);
  // Mat
  ctx.fillStyle = PALETTES.pathEdge;
  ctx.fillRect(x+4, y+28, 24, 4);
}

function drawSignTile(ctx, x, y) {
  ctx.fillStyle = PALETTES.grass1;
  ctx.fillRect(x, y, 32, 32);
  // Post
  ctx.fillStyle = PALETTES.signPost;
  ctx.fillRect(x+14, y+18, 4, 14);
  // Sign board
  ctx.fillStyle = PALETTES.sign;
  ctx.fillRect(x+4, y+6, 24, 14);
  ctx.fillStyle = PALETTES.signPost;
  ctx.fillRect(x+4, y+4, 24, 2);
  ctx.fillRect(x+4, y+20, 24, 2);
  // Text lines
  ctx.fillStyle = PALETTES.doorFrame;
  ctx.fillRect(x+8, y+10, 16, 2);
  ctx.fillRect(x+8, y+14, 12, 2);
}

function drawFlowerTile(ctx, x, y) {
  ctx.fillStyle = PALETTES.grass1;
  ctx.fillRect(x, y, 32, 32);
  // Stems
  ctx.fillStyle = PALETTES.grass3;
  ctx.fillRect(x+8, y+16, 2, 8);
  ctx.fillRect(x+20, y+12, 2, 10);
  // Flowers
  ctx.fillStyle = PALETTES.flower1;
  ctx.fillRect(x+6, y+12, 6, 6);
  ctx.fillStyle = PALETTES.flower2;
  ctx.fillRect(x+18, y+8, 6, 6);
  // Centers
  ctx.fillStyle = PALETTES.path1;
  ctx.fillRect(x+8, y+14, 2, 2);
  ctx.fillRect(x+20, y+10, 2, 2);
}

// Render a single tile
export function renderTile(ctx, tileType, px, py, frame) {
  switch (tileType) {
    case TILES.GRASS:        drawGrassTile(ctx, px, py); break;
    case TILES.GRASS_DARK:   drawDarkGrassTile(ctx, px, py); break;
    case TILES.PATH:         drawPathTile(ctx, px, py); break;
    case TILES.TREE:         drawTreeTile(ctx, px, py); break;
    case TILES.WATER:        drawWaterTile(ctx, px, py, frame); break;
    case TILES.FENCE:        drawFenceTile(ctx, px, py); break;
    case TILES.ROOF_RED:     drawRoofTile(ctx, px, py, 'roofRed'); break;
    case TILES.ROOF_BLUE:    drawRoofTile(ctx, px, py, 'roofBlue'); break;
    case TILES.ROOF_PURPLE:  drawRoofTile(ctx, px, py, 'roofPurple'); break;
    case TILES.ROOF_BROWN:   drawRoofTile(ctx, px, py, 'roofBrown'); break;
    case TILES.ROOF_ORANGE:  drawRoofTile(ctx, px, py, 'roofOrange'); break;
    case TILES.WALL:         drawWallTile(ctx, px, py); break;
    case TILES.WINDOW:       drawWindowTile(ctx, px, py); break;
    case TILES.DOOR:         drawDoorTile(ctx, px, py); break;
    case TILES.SIGN:         drawSignTile(ctx, px, py); break;
    case TILES.FLOWER:       drawFlowerTile(ctx, px, py); break;
    default:                 drawGrassTile(ctx, px, py); break;
  }
}

// Pre-render entire map to offscreen canvas
export function renderMap(frame) {
  const canvas = document.createElement('canvas');
  canvas.width = MAP_W * TILE_SIZE;
  canvas.height = MAP_H * TILE_SIZE;
  const ctx = canvas.getContext('2d');

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      renderTile(ctx, MAP[y][x], x * TILE_SIZE, y * TILE_SIZE, frame);
    }
  }

  // Draw building labels
  ctx.fillStyle = PALETTES.black;
  ctx.font = '10px monospace';
  // We'll draw labels via the engine instead for better control

  return canvas;
}

// --- Sprite rendering ---
// Draws a trainer sprite at pixel position
// dir: 0=down, 1=up, 2=left, 3=right
// frame: 0 or 1 (walk cycle)
export function drawSprite(ctx, px, py, colors, dir, frame, status) {
  const c = colors;
  const skin = PALETTES.agentSkin;
  const skinS = PALETTES.agentSkinS;
  const eye = PALETTES.agentEye;
  const hat = c.hat;
  const hatD = c.hatD;
  const shirt = c.shirt;
  const shirtD = c.shirtD;
  const pants = c.pants;
  const shoes = c.shoes;

  const f = frame % 2;
  const X = Math.round(px);
  const Y = Math.round(py);

  // Simple trainer sprite - front facing (dir=0)
  // All directions share similar structure but differ slightly

  const p = (color, x, y, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(X + x*2, Y + y*2, (w||1)*2, (h||1)*2);
  };

  if (dir === 0) { // Down (front)
    // Hat
    p(hat, 5, 0, 6, 1);
    p(hat, 4, 1, 8, 3);
    p(hatD, 4, 3, 8, 1);
    // Face
    p(skin, 5, 4, 6, 4);
    p(skinS, 5, 7, 6, 1);
    // Eyes
    p(eye, 6, 5, 2, 2);
    p(eye, 10, 5, 2, 2);
    // Eye shine
    p('#f8f8f8', 6, 5, 1, 1);
    p('#f8f8f8', 10, 5, 1, 1);
    // Body
    p(shirt, 4, 8, 8, 4);
    p(shirtD, 4, 11, 8, 1);
    // Arms
    if (f === 0) {
      p(skin, 3, 8, 1, 3);
      p(skin, 12, 8, 1, 3);
    } else {
      p(skin, 3, 9, 1, 3);
      p(skin, 12, 7, 1, 3);
    }
    // Pants
    p(pants, 5, 12, 3, 2);
    p(pants, 9, 12, 3, 2);
    // Shoes
    if (f === 0) {
      p(shoes, 5, 14, 3, 2);
      p(shoes, 9, 14, 3, 2);
    } else {
      p(shoes, 4, 14, 3, 2);
      p(shoes, 10, 14, 3, 2);
    }
  } else if (dir === 1) { // Up (back)
    // Hat
    p(hat, 5, 0, 6, 1);
    p(hat, 4, 1, 8, 4);
    p(hatD, 4, 4, 8, 1);
    // Hair/back of head
    p(hatD, 5, 5, 6, 3);
    // Body
    p(shirt, 4, 8, 8, 4);
    p(shirtD, 4, 11, 8, 1);
    // Arms
    if (f === 0) {
      p(skin, 3, 8, 1, 3);
      p(skin, 12, 8, 1, 3);
    } else {
      p(skin, 3, 7, 1, 3);
      p(skin, 12, 9, 1, 3);
    }
    // Pants
    p(pants, 5, 12, 3, 2);
    p(pants, 9, 12, 3, 2);
    // Shoes
    if (f === 0) {
      p(shoes, 5, 14, 3, 2);
      p(shoes, 9, 14, 3, 2);
    } else {
      p(shoes, 4, 14, 3, 2);
      p(shoes, 10, 14, 3, 2);
    }
  } else if (dir === 2) { // Left
    // Hat
    p(hat, 4, 0, 6, 1);
    p(hat, 3, 1, 8, 3);
    p(hatD, 3, 3, 8, 1);
    // Face
    p(skin, 4, 4, 6, 4);
    p(skinS, 4, 7, 6, 1);
    // Eye
    p(eye, 5, 5, 2, 2);
    p('#f8f8f8', 5, 5, 1, 1);
    // Body
    p(shirt, 4, 8, 7, 4);
    p(shirtD, 4, 11, 7, 1);
    // Arm
    if (f === 0) {
      p(skin, 3, 8, 1, 3);
    } else {
      p(skin, 2, 8, 1, 3);
    }
    // Pants
    p(pants, 5, 12, 3, 2);
    p(pants, 8, 12, 2, 2);
    // Shoes
    if (f === 0) {
      p(shoes, 5, 14, 3, 2);
      p(shoes, 8, 14, 2, 2);
    } else {
      p(shoes, 4, 14, 3, 2);
      p(shoes, 9, 14, 2, 2);
    }
  } else { // Right (dir === 3)
    // Hat
    p(hat, 6, 0, 6, 1);
    p(hat, 5, 1, 8, 3);
    p(hatD, 5, 3, 8, 1);
    // Face
    p(skin, 6, 4, 6, 4);
    p(skinS, 6, 7, 6, 1);
    // Eye
    p(eye, 9, 5, 2, 2);
    p('#f8f8f8', 10, 5, 1, 1);
    // Body
    p(shirt, 5, 8, 7, 4);
    p(shirtD, 5, 11, 7, 1);
    // Arm
    if (f === 0) {
      p(skin, 12, 8, 1, 3);
    } else {
      p(skin, 13, 8, 1, 3);
    }
    // Pants
    p(pants, 6, 12, 2, 2);
    p(pants, 9, 12, 3, 2);
    // Shoes
    if (f === 0) {
      p(shoes, 6, 14, 2, 2);
      p(shoes, 9, 14, 3, 2);
    } else {
      p(shoes, 5, 14, 2, 2);
      p(shoes, 10, 14, 3, 2);
    }
  }

  // Status emote bubble (Pokemon-style, floats above head)
  if (status && status !== 'walking') {
    const t = (Date.now() / 300) | 0;
    const bobY = Math.sin(Date.now() / 400) * 2;
    const bx = X + 24;
    const by = Y - 24 + bobY;

    // Bubble background
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(bx, by, 20, 20);
    ctx.strokeStyle = '#383028';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, 20, 20);
    // Pointer
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(bx + 4, by + 20, 4, 4);
    ctx.fillStyle = '#383028';
    ctx.fillRect(bx + 2, by + 20, 2, 4);
    ctx.fillRect(bx + 8, by + 20, 2, 4);

    if (status === 'working') {
      // Exclamation mark "!" - bouncing
      const bounce = (t % 4 === 0) ? -2 : 0;
      ctx.fillStyle = '#e03030';
      ctx.fillRect(bx + 8, by + 4 + bounce, 4, 8);
      ctx.fillRect(bx + 8, by + 14 + bounce, 4, 2);
    } else if (status === 'thinking') {
      // Animated "..." dots appearing one by one
      const dots = (t % 4);
      ctx.fillStyle = '#3060c0';
      if (dots >= 1) ctx.fillRect(bx + 4, by + 10, 4, 4);
      if (dots >= 2) ctx.fillRect(bx + 10, by + 10, 4, 4);
      if (dots >= 3) ctx.fillRect(bx + 4, by + 6, 4, 4);
    } else if (status === 'done') {
      // Green checkmark
      ctx.fillStyle = '#20a030';
      ctx.fillRect(bx + 4, by + 10, 2, 4);
      ctx.fillRect(bx + 6, by + 12, 2, 2);
      ctx.fillRect(bx + 8, by + 14, 2, 2);
      ctx.fillRect(bx + 10, by + 12, 2, 2);
      ctx.fillRect(bx + 12, by + 10, 2, 2);
      ctx.fillRect(bx + 14, by + 8, 2, 2);
      ctx.fillRect(bx + 16, by + 6, 2, 2);
    } else if (status === 'idle') {
      // Zzz sleeping
      ctx.fillStyle = '#8080c0';
      const z = t % 3;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Z', bx + 4, by + 8);
      if (z >= 1) ctx.fillText('z', bx + 10, by + 4);
      if (z >= 2) ctx.fillText('z', bx + 14, by + 0);
    }
  }
}

// --- A* Pathfinding ---
export function findPath(startX, startY, endX, endY) {
  // Clamp to map bounds
  const sx = Math.max(0, Math.min(MAP_W - 1, Math.round(startX)));
  const sy = Math.max(0, Math.min(MAP_H - 1, Math.round(startY)));
  const ex = Math.max(0, Math.min(MAP_W - 1, Math.round(endX)));
  const ey = Math.max(0, Math.min(MAP_H - 1, Math.round(endY)));

  if (sx === ex && sy === ey) return [];
  if (!WALKABLE.has(MAP[ey]?.[ex])) return [];

  const key = (x, y) => `${x},${y}`;
  const heuristic = (x, y) => Math.abs(x - ex) + Math.abs(y - ey);
  const h0 = heuristic(sx, sy);
  const open = [{ x: sx, y: sy, g: 0, h: h0, f: h0, parent: null }];
  const closed = new Set();
  const gScores = new Map();
  gScores.set(key(sx, sy), 0);

  while (open.length > 0) {
    // Find lowest f
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const current = open.splice(bestIdx, 1)[0];

    if (current.x === ex && current.y === ey) {
      // Reconstruct path
      const path = [];
      let node = current;
      while (node.parent) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    closed.add(key(current.x, current.y));

    // Neighbors (4-directional)
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const [dx, dy] of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue;
      if (!WALKABLE.has(MAP[ny][nx])) continue;
      if (closed.has(key(nx, ny))) continue;

      const g = current.g + 1;
      const existingG = gScores.get(key(nx, ny));

      if (existingG !== undefined && g >= existingG) continue;

      gScores.set(key(nx, ny), g);
      const h = heuristic(nx, ny);
      open.push({ x: nx, y: ny, g, h, f: g + h, parent: current });
    }

    // Safety: prevent infinite loops
    if (closed.size > MAP_W * MAP_H) break;
  }

  return []; // No path found
}

// Draw building label
export function drawBuildingLabel(ctx, name, centerX, topY) {
  ctx.fillStyle = PALETTES.black;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(name, centerX * TILE_SIZE + TILE_SIZE / 2, (topY - 1) * TILE_SIZE + 20);
}
