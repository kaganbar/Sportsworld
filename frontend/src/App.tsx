import { BrowserRouter, Route, Routes } from "react-router-dom";

import BasketballGameDetail from "./pages/BasketballGameDetail";
import BasketballGames from "./pages/BasketballGames";
import FootballGames from "./pages/FootballGames";
import GameDetail from "./pages/GameDetail";
import SportSelect from "./pages/SportSelect";
import TennisMatchDetail from "./pages/TennisMatchDetail";
import TennisMatches from "./pages/TennisMatches";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SportSelect />} />
        <Route path="/football" element={<FootballGames />} />
        <Route path="/football/games/:id" element={<GameDetail />} />
        <Route path="/basketball" element={<BasketballGames />} />
        <Route path="/basketball/games/:id" element={<BasketballGameDetail />} />
        <Route path="/tennis" element={<TennisMatches />} />
        <Route path="/tennis/matches/:id" element={<TennisMatchDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
