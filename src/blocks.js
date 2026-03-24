// Block type definitions
export const AIR = 0;
export const GRASS = 1;
export const DIRT = 2;
export const STONE = 3;
export const WOOD = 4;
export const LEAVES = 5;
export const SAND = 6;
export const WATER = 7;
export const COBBLESTONE = 8;
export const PLANKS = 9;
export const BEDROCK = 10;
export const SNOW = 11;
export const GLASS = 12;

export const BLOCK_DATA = {
  [AIR]:         { name: 'Air',         color: null,     transparent: true,  solid: false },
  [GRASS]:       { name: 'Grass',       color: 0x5a8f3c, transparent: false, solid: true, topColor: 0x5a8f3c, sideColor: 0x6b5c3e, bottomColor: 0x6b5c3e },
  [DIRT]:        { name: 'Dirt',         color: 0x6b5c3e, transparent: false, solid: true },
  [STONE]:       { name: 'Stone',        color: 0x808080, transparent: false, solid: true },
  [WOOD]:        { name: 'Wood',         color: 0x6b4f2e, transparent: false, solid: true, topColor: 0x8b7355, sideColor: 0x6b4f2e },
  [LEAVES]:      { name: 'Leaves',       color: 0x3a7a2a, transparent: true,  solid: true },
  [SAND]:        { name: 'Sand',         color: 0xc2b280, transparent: false, solid: true },
  [WATER]:       { name: 'Water',        color: 0x3366aa, transparent: true,  solid: false, alpha: 0.6 },
  [COBBLESTONE]: { name: 'Cobblestone',  color: 0x6a6a6a, transparent: false, solid: true },
  [PLANKS]:      { name: 'Planks',       color: 0xa08050, transparent: false, solid: true },
  [BEDROCK]:     { name: 'Bedrock',      color: 0x333333, transparent: false, solid: true },
  [SNOW]:        { name: 'Snow',         color: 0xe8e8f0, transparent: false, solid: true },
  [GLASS]:       { name: 'Glass',        color: 0xccddee, transparent: true,  solid: true, alpha: 0.3 },
};

// Blocks available in hotbar
export const HOTBAR_BLOCKS = [GRASS, DIRT, STONE, WOOD, PLANKS, COBBLESTONE, SAND, GLASS, LEAVES];
