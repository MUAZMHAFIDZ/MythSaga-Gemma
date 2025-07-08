import React from "react";
import { spellBook } from "../constants/spells";

const SpellBook = ({ lang }) => {
  return (
    <div className="p-4 border rounded bg-white mb-4">
      <h2 className="text-xl font-bold mb-2">
        {lang === "id" ? "📜 Buku Sihir" : "📜 Spell Book"}
      </h2>
      {Object.entries(spellBook).map(([level, spells]) => (
        <div key={level} className="mb-2">
          <h3 className="font-semibold capitalize">{level}</h3>
          <ul className="list-disc list-inside">
            {spells.map((spell, i) => (
              <li key={i}>
                <strong>{spell.name}</strong>: {spell.effect[lang]}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default SpellBook;
