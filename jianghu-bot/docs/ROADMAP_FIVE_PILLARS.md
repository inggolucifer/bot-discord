# Roadmap: Five Pillars & Combat System Expansions

## 1. What This PR Implemented (Framework vs Live)

This update establishes the foundation for the Five-Pillars Stats system (Mood, Vitality, Focus, Luck, Insight) in the MongoDB schema and backend guards, preparing the groundwork for upcoming minigames and map features.

### Live Frameworks Implemented:
* **Stamina Fix:** Player schema now explicitly tracks `maxStamina` (defaults to 100), and `currentStamina` accurately reads from the database. Stamina is properly clamped within `getComputedStats` and returned correctly in the UI payloads.
* **Energy Unification:** `innerEnergy` has been detached from UI processing logic, enforcing the API-defined `energy` (derived from `calculateEnergy`) as the single source of truth for energy.
* **Mood System:** Added `extendedStats.mood` and a `moodConsumables` array for tracking 72-hour window diminishing returns (0.7 decay factor). Centralized cost rules in `config/fivePillars.js` and implemented `assertMood` and `applyMoodDelta`. Plugged mood costs into manual learning, cultivation breakthrough, and crafting endpoints.
* **Vitality System:** Combat debuffs are fully integrated into `getComputedStats`. If vitality drops below 50%, a 20% combat stat debuff applies. Below 20%, a 50% combat stat debuff applies (ATK, DEF, SPD, Max HP, Max MP).
* **Focus Marks:** Implemented schema arrays `focusMarks` and built API endpoints `POST /api/player/focus/mark` (costs 30 focus) and `DELETE /api/player/focus/marks` to apply and clear marks for map tracking.
* **Luck & Insight:** `requiredInsight` field added to `Manual` and `Law` schemas for upcoming minigame difficulty scaling.
* **Combat Resists:** `martialRes`, `spiritualRes`, and `critRes` are successfully tracked and output in canonical stat arrays separate from one another.
* **Manual Slots & Core:** Core XP is no longer awarded universally. It is now only intended to upgrade when manuals level up. Players have `5 + Math.floor(core/5)` manual slots. Added an endpoint to unlearn manuals.
* **Battle Inventory:** Added `usableInBattle` boolean to items.
* **Roots Cleanup:** Applied one-time migration hook for fixing bugged 10-all spiritual roots to 0.

## 2. Next Development Priorities

In sequential priority order:
1. **Minigames Phase 1:** Implement full UX and result hooks for manual learning, laws, forge, alchemy, mining, herbology, cooking, fishing, and talismans. Hook the minigame results to consume the mood costs.
2. **Map Focus Marks UI:** Expose the focus mark UI on the front-end grid overview and display NPC conditions icons (based on tracked focus marks).
3. **Battle Inventory Panel:** Expose usable items in the combat instanced screen to consume restorative items (HP, Mood, Vitality) in battle.
4. **Full Talisman Effects:** Wire actual talisman effects (e.g. stealth, map efficiency, combat resist) into the main computation loop.
5. **Out-of-Battle Steal NPC Flow:** Implement out-of-battle stealing logic against NPCs. Failure hooks should trigger NPC hostility and force combat.
6. **Multi Cultivation Types:** Allow distinct branches of cultivation styles to level separately (instead of just generic Qi refining).
7. **Economy Sourcing:** Introduce new ways for players to source Vitality items, Mood items, and Core upgrade mechanics via world drop tables.

## 3. Open Risks
* **Double Craft XP:** Because we've added mood costs, we need to ensure players aren't finding ways to circumvent the attempt cost on failed minigames resulting in unearned XP or bypassing the cost altogether by canceling the UI.
* **Vitality Death Spiral:** Since lower Vitality imposes up to 50% combat stat debuffs, players might be trapped in a state where they repeatedly die and lose more vitality without any accessible ways to heal it if the economy lacks cheap restorative items initially.
* **Focus Overlap:** We need to handle edge cases if an NPC disappears/dies while currently tracked in the `focusMarks` list.
