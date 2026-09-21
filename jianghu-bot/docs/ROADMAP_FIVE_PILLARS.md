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

### Website Survival Loop Sprint Updates (Completed):
* **Truthful Stats:** Fixed `StatGrid` and Profile header so Stamina and Energy accurately read from the new API structure without hardcoding. Separated Martial and Spiritual Resistance displays. Added UX tooltips explaining the Five Pillars (Mood, Vitality, Focus).
* **Inventory Survival Use:** Restorative Item properties (`restoresHp`, `restoresStamina`, `restoresVitality`, `restoresMood`) have been added to the MongoDB schema and wired to the `POST /use-consumable` endpoint. Added a critical alert box in the Profile screen to warn users to eat/rest when HP or Stamina drop below 30%.
* **Battle Inventory Panel:** Replaced the simple battle command bar with a Quick Bag tray allowing the use of items mid-battle using the `usableInBattle` validation, seamlessly integrated with the tick system.
* **Cultivation Website UX:** Exposed Realm Level Caps and added warnings when at maximum level. Exposed the Breakthrough UI on the website showing base success rates and Mood costs (`CULTIVATION_BREAKTHROUGH`).
* **Manuals Unlearn UI:** Created a Tab on the Character page dedicated to Kitab & Jurus displaying the dynamic slot limit derived from Core, complete with an endpoint `POST /manuals/unlearn`.
* **Profession Minigame:** Built a Timing-Bar Minigame for Forging (`ForgeMinigame.tsx`). Hooked into `POST /professions/start` and `POST /professions/complete` which now appropriately deduct Mood costs (`CRAFT_FORGE`) based on `fivePillars.js` configurations.

## 2. Next Development Priorities

In sequential priority order:
1. **Minigames Phase 2:** Implement remaining full UX and result hooks for manual learning, laws, alchemy, mining, herbology, cooking, fishing, and talismans.
2. **Map Focus Marks UI:** Expose the focus mark UI on the front-end grid overview and display NPC conditions icons (based on tracked focus marks).
3. **Full Talisman Effects:** Wire actual talisman effects (e.g. stealth, map efficiency, combat resist) into the main computation loop.
4. **Out-of-Battle Steal NPC Flow:** Implement out-of-battle stealing logic against NPCs. Failure hooks should trigger NPC hostility and force combat.
5. **Multi Cultivation Types:** Allow distinct branches of cultivation styles to level separately (instead of just generic Qi refining).
6. **Economy Sourcing:** Introduce new ways for players to source Vitality items, Mood items, and Core upgrade mechanics via world drop tables.

## 3. Open Risks
* **Double Craft XP:** Because we've added mood costs, we need to ensure players aren't finding ways to circumvent the attempt cost on failed minigames resulting in unearned XP or bypassing the cost altogether by canceling the UI.
* **Vitality Death Spiral:** Since lower Vitality imposes up to 50% combat stat debuffs, players might be trapped in a state where they repeatedly die and lose more vitality without any accessible ways to heal it if the economy lacks cheap restorative items initially.
* **Focus Overlap:** We need to handle edge cases if an NPC disappears/dies while currently tracked in the `focusMarks` list.
