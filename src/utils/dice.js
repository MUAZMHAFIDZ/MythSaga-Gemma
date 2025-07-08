export function rollDice(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export function randomEncounter(monsters, npcs) {
  const roll = rollDice(20);

  let includeMonster = false;
  let includeNPC = false;

  if (roll <= 6) {
    includeMonster = true;
  } else if (roll <= 10) {
    includeNPC = true;
  } else if (roll <= 16) {
    includeMonster = true;
    includeNPC = true;
  } else {
    // peaceful
  }

  const selectedMonsters = includeMonster
    ? pickRandom(monsters, rollDice(2)) // 1–2 monsters
    : [];
  const selectedNPCs = includeNPC ? [pickRandom(npcs, 1)[0]] : [];

  return {
    monsters: selectedMonsters,
    npcs: selectedNPCs,
  };
}

function pickRandom(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
