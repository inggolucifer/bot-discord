# Battle Arena & Combat System (C78)

> 16 nodes · cohesion 0.26

## Key Concepts

- **pet.js** (20 connections) — `jianghu-bot/web-api/routes/pet.js`
- **services/petService.js** (12 connections) — `jianghu-bot/services/petService.js`
- **pet/petService.js** (12 connections) — `jianghu-bot/services/player/pet/petService.js`
- **execute()** (7 connections) — `jianghu-bot/services/player/pet/petService.js`
- **simulateRound()** (6 connections) — `jianghu-bot/services/petService.js`
- **PetBattle.js** (5 connections) — `jianghu-bot/models/PetBattle.js`
- **addExp()** (5 connections) — `jianghu-bot/services/petService.js`
- **getExpRequired()** (5 connections) — `jianghu-bot/services/petService.js`
- **parsePetItemEffect()** (5 connections) — `jianghu-bot/services/petService.js`
- **createPetInstance()** (2 connections) — `jianghu-bot/services/petService.js`
- **getElementAdvantage()** (2 connections) — `jianghu-bot/services/petService.js`
- **getRandomStatMultiplier()** (2 connections) — `jianghu-bot/services/petService.js`
- **autocomplete()** (2 connections) — `jianghu-bot/services/player/pet/petService.js`
- **petBattleSchema** (1 connections) — `jianghu-bot/models/PetBattle.js`
- **RANK_MULTIPLIER** (1 connections) — `jianghu-bot/services/petService.js`
- **router** (1 connections) — `jianghu-bot/web-api/routes/pet.js`

## Relationships

- [Cultivation & Law Engine (C11)](Cultivation_&_Law_Engine_C11.md) (5 shared connections)
- [Inventory & Equipment Management (C2)](Inventory_&_Equipment_Management_C2.md) (4 shared connections)
- [Cultivation & Law Engine (C24)](Cultivation_&_Law_Engine_C24.md) (4 shared connections)
- [Inventory & Equipment Management (C8)](Inventory_&_Equipment_Management_C8.md) (4 shared connections)
- [Inventory & Equipment Management (C13)](Inventory_&_Equipment_Management_C13.md) (2 shared connections)
- [Inventory & Equipment Management (C30)](Inventory_&_Equipment_Management_C30.md) (2 shared connections)
- [Cultivation & Law Engine (C16)](Cultivation_&_Law_Engine_C16.md) (2 shared connections)
- [Cultivation & Law Engine (C14)](Cultivation_&_Law_Engine_C14.md) (1 shared connections)
- [Sect System & Entrance Exam (C10)](Sect_System_&_Entrance_Exam_C10.md) (1 shared connections)
- [Cultivation & Law Engine (C58)](Cultivation_&_Law_Engine_C58.md) (1 shared connections)

## Source Files

- `jianghu-bot/models/PetBattle.js`
- `jianghu-bot/services/petService.js`
- `jianghu-bot/services/player/pet/petService.js`
- `jianghu-bot/web-api/routes/pet.js`

## Audit Trail

- EXTRACTED: 51 (89%)
- INFERRED: 6 (11%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*