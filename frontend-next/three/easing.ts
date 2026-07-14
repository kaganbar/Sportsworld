// Shared easing curve — originally hand-written once in WorldCameraRig.tsx
// for the camera's zone-to-zone dolly, now reused by the formation-shift
// logic in each scene's Ball component too, instead of being copy-pasted
// a second time.
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
