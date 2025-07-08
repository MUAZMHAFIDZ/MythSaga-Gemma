import React, { useState } from "react";

const DiceRoller = ({ lang }) => {
  const [result, setResult] = useState(null);

  const rollDice = (sides) => {
    const value = Math.floor(Math.random() * sides) + 1;
    setResult(`🎲 D${sides}: ${value}`);
  };

  return (
    <div className="p-4 border rounded bg-white mb-4">
      <h2 className="text-xl font-bold mb-2">
        {lang === "id" ? "🎲 Lempar Dadu" : "🎲 Dice Roller"}
      </h2>
      <div className="flex gap-2 mb-2 flex-wrap">
        {[4, 6, 8, 10, 12, 20].map((sides) => (
          <button
            key={sides}
            className="bg-blue-500 text-white px-3 py-1 rounded"
            onClick={() => rollDice(sides)}
          >
            D{sides}
          </button>
        ))}
      </div>
      {result && <p className="font-mono">{result}</p>}
    </div>
  );
};

export default DiceRoller;
