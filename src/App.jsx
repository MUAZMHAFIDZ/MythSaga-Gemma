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

const Spinner = () => (
  <div className="flex flex-col items-center justify-center space-y-3 py-10">
    <svg
      className="animate-spin h-10 w-10 text-yellow-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8z"
      />
    </svg>
    <p className="text-stone-300 animate-pulse">Processing turn...</p>
  </div>
);

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
  const turnCount = useRef(0);

  const [encounterTurnAge, setEncounterTurnAge] = useState(1);
  const [prevEncounter, setPrevEncounter] = useState(null);

  useEffect(() => {
    setVisibleEncounter(encounter);
  }, [encounter]);

  useEffect(() => {
    if (character && history.length === 0) {
      setTimeout(() => handleStart("Let's begin."), 500);
    }
  }, [character]);

  const simulateBattle = () => {
    const chance = Math.random();
    if (chance < 0.1) return "lose";
    if (chance < 0.6) return "escape";
    return "win";
  };

  const handleStart = async (choice) => {
    if (gameOver || loading) return;

    setLoading(true);
    setOptions([]);

    const dice = rollDice(20);
    let newLoc = location;
    if (dice < 2) newLoc = Math.max(0, location - 1);
    else if (dice < 5) newLoc = location + 1;
    setLocation(newLoc);

    turnCount.current += 1;

    let outcome = null;

    if (turnCount.current >= 3 && encounter.monsters.length > 0) {
      outcome = simulateBattle();
      if (outcome === "lose") {
        setGameOver(true);
        setLoading(false);
        return;
      }
    }

    const player = `${character.name} the ${character.race} ${character.class}`;
    const spell = classSpells[character.class]?.[0] || "basic spell";
    const weapon = classWeapons[character.class] || "sword";

    const monsterText = encounter.monsters
      .map((m) => `${m.name} (${m.difficulty})`)
      .join(", ");
    const npcText = encounter.npcs
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

      let newEncounter = { ...encounter };

      if (encounterTurnAge < 4) {
        newEncounter = encounter;
        setEncounterTurnAge((age) => age + 1);
      } else if (encounterTurnAge >= 6) {
        newEncounter = { monsters: [], npcs: [] };
        setEncounterTurnAge(0);
      } else if (Math.random() < 0.5 || ended) {
        newEncounter = randomEncounter(monsters, npcs);
        setEncounterTurnAge(1);
      } else {
        newEncounter = encounter;
        setEncounterTurnAge((age) => age + 1);
      }

      setPrevEncounter(encounter);
      setEncounter(newEncounter);
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

    setTimeout(() => {
      setLoading(false);
    }, 8000);
  };

  const handleOptionClick = async (opt) => {
    setLoading(true);
    setOptions([]);
    await handleStart(opt);
    setTimeout(() => setLoading(false), 8000);
  };

  if (gameOver) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[url('/bg-fantasy.jpg')] bg-cover bg-fixed">
        <div className="bg-black/70 p-8 rounded-xl text-center border border-red-700 text-white max-w-md shadow-xl">
          <h1 className="text-3xl font-bold text-red-500 mb-4">💀 Game Over</h1>
          <p className="text-gray-300 mb-4">You died in battle.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-700 hover:bg-red-800 text-white px-6 py-2 rounded-lg shadow"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!lang)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[url('/bg-fantasy.jpg')] bg-cover bg-fixed">
        <div className="bg-black/70 p-8 rounded-lg text-center text-white shadow-xl border border-yellow-700 max-w-md">
          <h1 className="text-2xl font-bold mb-4">🌍 Choose Language</h1>
          <button
            onClick={() => setLang("en")}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded m-2 shadow"
          >
            English
          </button>
          <button
            onClick={() => setLang("id")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded m-2 shadow"
          >
            Bahasa Indonesia
          </button>
        </div>
      </div>
    );

  if (!character)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[url('/bg-fantasy.jpg')] bg-cover bg-fixed">
        <div className="bg-black/70 text-white p-8 rounded-xl shadow-xl border border-stone-600 max-w-md w-full space-y-4">
          <h2 className="text-2xl font-bold text-yellow-400">
            🧝 Create Your Character
          </h2>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                characterForm.name &&
                characterForm.race &&
                characterForm.class
              ) {
                setCharacter(characterForm);
                setEncounter(randomEncounter(monsters, npcs));
                setEncounterTurnAge(1);
                turnCount.current = 1;
              }
            }}
          >
            <input
              className="w-full bg-stone-800 text-white px-3 py-2 rounded border border-stone-500"
              placeholder="Enter your name"
              value={characterForm.name}
              onChange={(e) =>
                setCharacterForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <select
              className="w-full bg-stone-800 text-white px-3 py-2 rounded border border-stone-500"
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
              className="w-full bg-stone-800 text-white px-3 py-2 rounded border border-stone-500"
              value={characterForm.class}
              onChange={(e) =>
                setCharacterForm((prev) => ({
                  ...prev,
                  class: e.target.value,
                }))
              }
            >
              <option value="">Select Class</option>
              {classes.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button
              type="submit"
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold px-4 py-2 rounded shadow"
            >
              Start Adventure
            </button>
          </form>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[url('/bg.webp')] bg-fixed bg-cover text-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <header className="text-center font-[UnifrakturCook]">
          <h1 className="text-3xl font-bold text-yellow-400">
            MythSaga: Gemma Realms
          </h1>
          <p className="text-sm text-stone-300 mt-1">
            {character.name} the {character.race} {character.class} | Location:{" "}
            {location}
          </p>
        </header>

        {(visibleEncounter.monsters.length > 0 ||
          visibleEncounter.npcs.length > 0) && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...visibleEncounter.monsters, ...visibleEncounter.npcs].map(
              (entity) => (
                <div
                  key={entity.id}
                  className="text-center p-3 bg-black/50 border border-stone-600 rounded-xl shadow hover:shadow-xl transition duration-300"
                >
                  <img
                    src={entity.image}
                    alt={entity.name}
                    className="w-24 h-24 mx-auto object-contain rounded"
                  />
                  <p className="text-sm font-bold text-white">{entity.name}</p>
                  <p
                    className={`text-xs ${
                      "difficulty" in entity ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    ({"difficulty" in entity ? entity.difficulty : entity.trait}
                    )
                  </p>
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
                <div className="bg-black/60 border border-stone-700 backdrop-blur-lg rounded-lg px-4 py-3 text-stone-100 whitespace-pre-wrap shadow-md">
                  {entry.content}
                </div>
              </div>
            ))}
        </section>

        {loading && <Spinner />}

        {!loading && options.length > 0 && (
          <div className="mt-4 space-y-2">
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleOptionClick(opt)}
                disabled={loading}
                className={`w-full bg-stone-800 hover:bg-stone-700 text-white border border-yellow-700 px-4 py-2 rounded-lg shadow transition-all duration-300 ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
