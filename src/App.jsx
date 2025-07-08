import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    if (character && history.length === 0) {
      handleStart("Let's begin.");
    }
  }, [character]);

  const handleStart = async (choice) => {
    const dice = rollDice(20);
    let newLoc = location;
    if (dice < 2) newLoc = Math.max(0, location - 1);
    else if (dice < 5) newLoc = location + 1;
    setLocation(newLoc);

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

If the player defeats the monster or escapes from danger, or the NPC finishes interaction and leaves, write "End Turn" at the end.
Do not continue the story from previous messages. Only respond to current situation and last choice: "${choice}".
`;

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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

      const noEncounter =
        encounter.monsters.length === 0 && encounter.npcs.length === 0;

      let newEncounter = encounter;
      if (ended || noEncounter) {
        newEncounter = randomEncounter(monsters, npcs);
        console.log("🎲 New Encounter:", newEncounter);
        setEncounter(newEncounter);
      }

      setHistory([
        { role: "user", content: choice },
        { role: "ai", content: text },
      ]);
      setOptions(opts);
      setVisibleEncounter(newEncounter);
    } catch (err) {
      console.error("Gemini Error:", err);
      setHistory([
        { role: "user", content: choice },
        { role: "ai", content: "⚠️ Gemini failed to respond." },
      ]);
      setOptions([]);
    }
  };

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
              setEncounter(randomEncounter(monsters, npcs)); // awal encounter
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
            disabled={
              !characterForm.name || !characterForm.race || !characterForm.class
            }
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-300"
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

      {options.length > 0 && (
        <div className="mt-4 space-y-2">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleStart(opt)}
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
