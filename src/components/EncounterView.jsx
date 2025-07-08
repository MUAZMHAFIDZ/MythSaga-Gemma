import React from "react";

const EncounterView = ({ monsters, npcs }) => {
  const combined = [
    ...monsters.map((m) => ({ ...m, type: "monster" })),
    ...npcs.map((n) => ({ ...n, type: "npc" })),
  ];

  if (combined.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
      {combined.map((c, idx) => (
        <div
          key={idx}
          className="text-center border p-2 rounded shadow bg-white"
        >
          <img
            src={c.image}
            alt={c.name}
            className="w-24 h-24 object-contain mx-auto"
          />
          <p className="font-bold mt-1">{c.name}</p>
          <p className="text-sm text-gray-600">
            {c.type === "monster"
              ? `⚔️ Difficulty: ${c.difficulty}`
              : `🧠 Trait: ${c.trait}`}
          </p>
        </div>
      ))}
    </div>
  );
};

export default EncounterView;
