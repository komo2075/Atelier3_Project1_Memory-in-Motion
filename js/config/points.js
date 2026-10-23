// EDIT HERE: one UI dot per entry. memoryId links to memories.js.
// Positions are Three.js world coordinates. y is the height above the ground.
export const points = [
  { id: 'point01', position: { x: -3, y: 2.27, z: -1.8 }, memoryId: 'memory01' },
  { id: 'point02', position: { x: -0.83, y: 0.40, z: -3.39 }, memoryId: 'memory02' },
  { id: 'point03', position: { x: -1.43, y: 0.2, z: -4.15 }, memoryId: 'memory03' },
  { id: 'point04', position: { x: 1.34, y: 0.40, z: -9.60 }, memoryId: 'memory04' },
  { id: 'point05', position: { x: -7.35, y: 0.40, z: -7.31 }, memoryId: 'memory05' },
  { id: 'point06', position: { x: -0.79, y: 0.40, z: -2.05 }, memoryId: 'memory06' },
  { id: 'point07', position: { x: 1.56, y: 0.5, z: -6.14 }, memoryId: 'memory07' },
  { id: 'point08', position: { x: 2.19, y: 0.32, z: 7.7 }, memoryId: 'memory08' },
  { id: 'point09', position: { x: -1.9, y: 1.70, z: -2.17 }, memoryId: 'memory09' },
  { id: 'point10', position: { x: -4.22, y: 0.9, z: -0.52 }, memoryId: 'memory10' },
  { id: 'point11', position: { x: -0.58, y: 0.40, z: -7.94 }, memoryId: 'memory11' },
  { id: 'point12', position: { x: 3.47, y: 0.40, z: -4.92 }, memoryId: 'memory12' },
  { id: 'point13', position: { x: -8.57, y: 0.40, z: -10.00 }, memoryId: 'memory13' },


  //special interactions
 {
  id: "pointS01",
  position: { x: -2.86, y: 0.9, z: -4.19 },
  memoryId: "memoryS01",
  interaction: 'landscape'
  },

  {
    id: "pointS02",
    position: { x: -1.23, y: 0.40, z: -7.55 },
    memoryId: "memoryS02",
    interaction: "blow"
  },

  {
    id: "pointS03",
    position: { x: 0.84, y: 0.40, z: 2.56 },
    memoryId: "memoryS03",
    interaction: "shake"
  }

];
