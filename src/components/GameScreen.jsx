import React from "react";
import { gameMap } from "../constants/map";

const GameScreen = ({ location, lang }) => {
  return (
    <div className="p-4 border rounded mb-4 bg-gray-100">
      <h2 className="text-xl font-bold mb-2">
        {lang === "id" ? "Lokasi Saat Ini:" : "Current Location:"}{" "}
        {gameMap[location][lang]}
      </h2>
      <p className="text-sm">
        {lang === "id" ? "Peta:" : "Map:"}{" "}
        {gameMap.map((loc) => loc[lang]).join(" ➡️ ")}
      </p>
    </div>
  );
};

export default GameScreen;
