export const ROBOT_POSITION = { x: 2, z: -2 };
export const INTERACTION_RADIUS = 2.4;
export function isNearRobot(x: number, z: number) {
  return Number.isFinite(x) && Number.isFinite(z) && Math.hypot(x - ROBOT_POSITION.x, z - ROBOT_POSITION.z) <= INTERACTION_RADIUS;
}
/** Tutorial only. Never use this client result to grant shop rewards. */
export function completesTutorial(repetitions: number) { return repetitions === 3; }
export function clampToIsland(x: number, z: number) {
  const length = Math.hypot(x, z);
  return length > 7.2 ? { x: x / length * 7.2, z: z / length * 7.2 } : { x, z };
}
