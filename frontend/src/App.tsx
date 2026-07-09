import { BrowserRouter, Route, Routes } from "react-router-dom";

import FootballGames from "./pages/FootballGames";
import GameDetail from "./pages/GameDetail";
import SportSelect from "./pages/SportSelect";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SportSelect />} />
        <Route path="/football" element={<FootballGames />} />
        <Route path="/football/games/:id" element={<GameDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
