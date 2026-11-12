import { Box2, PerspectiveCamera, Vector2, Vector3 } from "three";
import { getExplorerTransform, solarPlanets } from "./solar-system";

/** Fits the rendered system, not just its canvas element, on resize/view changes. */
export function frameSolarCamera(camera: PerspectiveCamera, width: number, height: number, compact: boolean) {
  const origin = new Vector3(0, compact ? 0.3 : 0.6, 0);
  camera.clearViewOffset();
  camera.zoom = 1;
  camera.aspect = width / height;
  camera.position.set(0, compact ? 1.2 : 2.5, compact ? 13 : 26);
  camera.lookAt(origin);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  const bounds = new Box2();
  // Fit every selection, including Saturn's rings, so focusing never zoom-jumps.
  for (let selected = 0; selected < solarPlanets.length; selected++) for (let index = 0; index < solarPlanets.length; index++) {
    const position = getExplorerTransform(index, selected, compact);
    const paddingX = position.radius * (solarPlanets[index].rings ? 2.25 : 1.85);
    const paddingY = position.radius * 1.65;
    for (const x of [-paddingX, paddingX]) for (const y of [-paddingY, paddingY]) for (const z of [-position.radius, position.radius]) {
      const point = new Vector3(position.x + x, position.y + y, position.z + z).project(camera);
      bounds.expandByPoint(new Vector2(point.x, point.y));
    }
  }
  const span = bounds.getSize(new Vector2());
  const center = bounds.getCenter(new Vector2());
  camera.zoom = Math.min((compact ? 1.7 : 1.9) / span.x, 1.84 / span.y);
  camera.setViewOffset(width, height, center.x * camera.zoom * width / 2, -center.y * camera.zoom * height / 2, width, height);
  camera.updateProjectionMatrix();
  return { widthRatio: span.x * camera.zoom / 2, heightRatio: span.y * camera.zoom / 2 };
}
