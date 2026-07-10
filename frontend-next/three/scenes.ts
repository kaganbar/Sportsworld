import { ComponentType } from "react";

import { SportKey } from "../theme/sportsTheme";
import BasketballScene from "./BasketballScene";
import FootballScene from "./FootballScene";
import TennisScene from "./TennisScene";

// Sport-key -> 3D scene component, mirroring sportsTheme.ts's registry shape.
// Sports with no entry here simply get no 3D layer — SportBackgroundCanvas
// falls back to the existing CSS gradient background.
export const scenes: Partial<Record<SportKey, ComponentType>> = {
  football: FootballScene,
  basketball: BasketballScene,
  tennis: TennisScene,
};
