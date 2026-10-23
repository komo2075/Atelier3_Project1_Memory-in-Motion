// EDIT HERE: one UI dot per entry. memoryId links to memories.js.
// Positions are Three.js world coordinates. y is the height above the ground.
export const points = [
  { id: 'point01', position: { x: -3, y: 2.27, z: -1.8 }, memoryId: 'memory01' },
  { id: 'point02', position: { x: 2.8, y: 2.5, z: -1.2 }, memoryId: 'memory02' },
  { id: 'point03', position: { x: 0.8, y: 1.2, z: 3.3 }, memoryId: 'memory03' },
  { id: 'point04', position: { x: -0.76, y: 2.27, z: 0.59 }, memoryId: 'memory04' },
  { id: 'point05', position: { x: -0.88, y: 0.40, z: 1.26 }, memoryId: 'memory05' },
  { id: 'point06', position: { x: -0.79, y: 0.40, z: -2.05 }, memoryId: 'memory06' },


  //special interactions
  {
    id: "pointS01",
    position: { x: 0.84, y: 0.40, z: 2.56 },
    memoryId: "memoryS01",
    interaction: "normal"
  },

  {
    id: "pointS02",
    position: { x: -1.23, y: 0.40, z: -7.55 },
    memoryId: "memoryS02",
    interaction: "blow"
  },

  {
    id: "pointS03",
    position: { x: -2, y: 2, z: 3 },
    memoryId: "memoryS03",
    interaction: "shake"
  }

];
