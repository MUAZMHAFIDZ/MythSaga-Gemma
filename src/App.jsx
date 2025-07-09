import React, { useEffect, useState, useRef } from "react";
import genAI from "./config/gemini";
import { rollDice, randomEncounter } from "./utils/dice";
import {
  races,
  classes,
  classSpells,
  classWeapons,
} from "./constants/characterData";
import { monsters } from "./constants/monsters";
import { npcs } from "./constants/npcs";

function parseOptions(text) {
  const regex = /\d\.\s*(.+)/g;
  const matches = [...text.matchAll(regex)];
  return matches
    .map((m) => m[1]?.trim())
    .filter(Boolean)
    .slice(0, 2);
}

const App = () => {
  const [lang, setLang] = useState("");
  const [characterForm, setCharacterForm] = useState({
    name: "",
    race: "",
    class: "",
  });
  const [character, setCharacter] = useState(null);
  const [history, setHistory] = useState([]);
  const [location, setLocation] = useState(0);
  const [options, setOptions] = useState([]);
  const [encounter, setEncounter] = useState({ monsters: [], npcs: [] });
  const [visibleEncounter, setVisibleEncounter] = useState({
    monsters: [],
    npcs: [],
  });
  const [loading, setLoading] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [battleOutcome, setBattleOutcome] = useState(null);
  const [nextVisibleEncounter, setNextVisibleEncounter] = useState(null);

  const turnCount = useRef(0);

  useEffect(() => {
    if (character && history.length === 0) {
      handleStart("Let's begin.");
    }
  }, [character]);

  const simulateBattle = () => {
    const chance = Math.random();
    if (chance < 0.2) return "lose"; // 3/10 kalah
    if (chance < 0.7) return "escape"; // 4/10 kabur
    return "win"; // 3/10 menang
  };

  const handleStart = async (choice) => {
    if (gameOver) return;

    const dice = rollDice(20);
    let newLoc = location;
    if (dice < 2) newLoc = Math.max(0, location - 1);
    else if (dice < 5) newLoc = location + 1;
    setLocation(newLoc);

    turnCount.current += 1;

    let currentEncounter = encounter;
    let outcome = null;

    const randomChance = Math.random();
    const shouldClearEncounter =
      turnCount.current % 5 === 0 ||
      (turnCount.current < 5 && randomChance < 0.3);

    if (shouldClearEncounter) {
      currentEncounter = { monsters: [], npcs: [] };
      setEncounter(currentEncounter);
      setVisibleEncounter(currentEncounter);
    }

    // Simulasi battle hanya jika ada monster
    if (currentEncounter.monsters.length > 0) {
      outcome = simulateBattle();
      setBattleOutcome(outcome);

      if (outcome === "lose") {
        setGameOver(true);
        return;
      }

      // Jika menang atau kabur, tetap generate prompt
      const newEncounter = randomEncounter(monsters, npcs);
      setEncounter(newEncounter);
      setVisibleEncounter(newEncounter);
    } else {
      setBattleOutcome(null); // reset jika tidak ada battle
    }

    const player = `${character.name} the ${character.race} ${character.class}`;
    const spell = classSpells[character.class]?.[0] || "basic spell";
    const weapon = classWeapons[character.class] || "sword";

    const monsterText = currentEncounter.monsters
      .map((m) => `${m.name} (${m.difficulty})`)
      .join(", ");
    const npcText = currentEncounter.npcs
      .map((n) => `${n.name} (${n.trait})`)
      .join(", ");

    const prompt = `
You are the Dungeon Master (DM) in a fantasy text adventure game.

Respond ONLY in ${lang === "id" ? "Bahasa Indonesia" : "English"}.
The player cannot type, so always give exactly two choices in this format:

[Short paragraph of story]

1. [First option]  
2. [Second option]

Player: ${player}
Weapon: ${weapon}, Spell: ${spell}
Location Index: ${newLoc}

Current Encounter:
- Monsters: ${monsterText || "None"}
- NPCs: ${npcText || "None"}

${outcome === "win" ? "The player has just defeated the monster." : ""}
${outcome === "escape" ? "The player has just escaped from the monster." : ""}

If the player defeats the monster or escapes from danger, or the NPC finishes interaction and leaves, write "End Turn" at the end.
Do not continue the story from previous messages. Only respond to current situation and last choice: "${choice}".
`;

    try {
      const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      const opts = parseOptions(text);

      const lowerText = text.toLowerCase();
      const ended =
        lowerText.includes("end turn") ||
        lowerText.includes("escaped") ||
        lowerText.includes("defeated") ||
        lowerText.includes("killed");

      let newEncounter = encounter;
      if (
        ended ||
        (encounter.monsters.length === 0 && encounter.npcs.length === 0)
      ) {
        newEncounter = randomEncounter(monsters, npcs);
        setEncounter(newEncounter);
      }

      if (nextVisibleEncounter) {
        setVisibleEncounter(nextVisibleEncounter);
        setNextVisibleEncounter(null);
      }
      setNextVisibleEncounter(newEncounter);

      setHistory([
        { role: "user", content: choice },
        { role: "ai", content: text },
      ]);
      setOptions(opts);
    } catch (err) {
      console.error("Gemini Error:", err);
      setHistory([
        { role: "user", content: choice },
        { role: "ai", content: "⚠️ Gemini failed to respond." },
      ]);
      setOptions([]);
    }
  };

  if (gameOver) {
    return (
      <div className="text-center p-10">
        <h1 className="text-3xl font-bold text-red-600 mb-4">💀 Game Over</h1>
        <p className="text-gray-700 mb-4">You died in battle.</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-6 py-2 rounded"
        >
          Ulangi
        </button>
      </div>
    );
  }

  if (!lang)
    return (
      <div className="p-6 max-w-md mx-auto text-center">
        <h1 className="text-xl font-bold mb-4">🌍 Choose Language</h1>
        <button
          onClick={() => setLang("en")}
          className="bg-blue-600 text-white px-4 py-2 rounded m-2"
        >
          English
        </button>
        <button
          onClick={() => setLang("id")}
          className="bg-green-600 text-white px-4 py-2 rounded m-2"
        >
          Bahasa Indonesia
        </button>
      </div>
    );

  if (!character)
    return (
      <div className="p-6 max-w-md mx-auto space-y-4">
        <h2 className="text-xl font-bold">🧝 Create Your Character</h2>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              characterForm.name &&
              characterForm.race &&
              characterForm.class
            ) {
              setCharacter(characterForm);
              setEncounter(randomEncounter(monsters, npcs));
              turnCount.current = 1;
            }
          }}
        >
          <input
            className="w-full border px-2 py-1"
            placeholder="Enter your name"
            value={characterForm.name}
            onChange={(e) =>
              setCharacterForm((prev) => ({
                ...prev,
                name: e.target.value,
              }))
            }
          />
          <select
            className="w-full border px-2 py-1"
            value={characterForm.race}
            onChange={(e) =>
              setCharacterForm((prev) => ({ ...prev, race: e.target.value }))
            }
          >
            <option value="">Select Race</option>
            {races.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <select
            className="w-full border px-2 py-1"
            value={characterForm.class}
            onChange={(e) =>
              setCharacterForm((prev) => ({ ...prev, class: e.target.value }))
            }
          >
            <option value="">Select Class</option>
            {classes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Start Adventure
          </button>
        </form>
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">MythSaga: Gemini Realms</h1>
        <p className="text-sm text-gray-500">
          {character.name} the {character.race} {character.class} | Location:{" "}
          {location}
        </p>
      </header>

      {(visibleEncounter.monsters.length > 0 ||
        visibleEncounter.npcs.length > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {[...visibleEncounter.monsters, ...visibleEncounter.npcs].map(
            (entity) => (
              <div key={entity.id} className="text-center">
                <img
                  src={entity.image}
                  alt={entity.name}
                  className="w-24 h-24 mx-auto object-contain"
                />
                <p className="text-sm font-medium">{entity.name}</p>
                {"difficulty" in entity ? (
                  <p className="text-xs text-red-500">({entity.difficulty})</p>
                ) : (
                  <p className="text-xs text-green-500">({entity.trait})</p>
                )}
              </div>
            )
          )}
        </div>
      )}

      <section className="space-y-3">
        {history
          .filter((h) => h.role === "ai")
          .slice(-1)
          .map((entry, idx) => (
            <div key={idx} className="text-left">
              <div className="inline-block px-3 py-2 rounded shadow bg-gray-100 text-gray-900 whitespace-pre-wrap">
                {entry.content}
              </div>
            </div>
          ))}
      </section>

      {loading && (
        <div className="text-center text-gray-500 animate-pulse">
          Loading... Please wait (cooldown)
        </div>
      )}

      {!loading && options.length > 0 && (
        <div className="mt-4 space-y-2">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => {
                setLoading(true);
                setOptions([]);
                setTimeout(() => {
                  handleStart(opt);
                  setLoading(false);
                }, 5000);
              }}
              className="w-full border px-3 py-2 rounded hover:bg-blue-50"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
