const fs = require('fs');

let staminaContent = fs.readFileSync('utils/stamina.js', 'utf8');
staminaContent = staminaContent.replace(
    "const currentTime = now.getTime();",
    "const currentTime = travelDoc.status === 'traveling' ? Math.min(now.getTime(), travelDoc.arrivalTime.getTime()) : now.getTime();"
);
fs.writeFileSync('utils/stamina.js', staminaContent);

let worldContent = fs.readFileSync('web-api/routes/world.js', 'utf8');

// Fix redundant travel drain
worldContent = worldContent.replace(`        const player = await Player.findOne({ discordId: userId });
        if (player) {
            applyTravelDrain(player, travel);
            if (travel.exhausted && !travel.exhaustPenaltyApplied && travel.status === "traveling") {
                 // apply penalty to arrival time
                 const nowTime = Date.now();
                 if (nowTime < travel.arrivalTime.getTime()) {
                     const remainingTime = travel.arrivalTime.getTime() - nowTime;
                     const extraTime = remainingTime * (staminaConfig.EXHAUSTED_TRAVEL_TIME_MULTIPLIER - 1);
                     travel.arrivalTime = new Date(travel.arrivalTime.getTime() + extraTime);
                 }
                 travel.exhaustPenaltyApplied = true;
            }
            await travel.save();
            await player.save();
        }`, "");

worldContent = worldContent.replace(`const travel = await Travel.findOne({ discordId: userId, status: { $in: ['traveling', 'ambushed'] } });`,
`let travel = await Travel.findOne({ discordId: userId, status: { $in: ['traveling', 'ambushed'] } });

        if (travel) {
            const playerPre = await Player.findOne({ discordId: userId });
            if (playerPre) {
                applyTravelDrain(playerPre, travel);
                if (travel.exhausted && !travel.exhaustPenaltyApplied && travel.status === 'traveling') {
                    const nowTime = Date.now();
                    if (nowTime < travel.arrivalTime.getTime()) {
                        const remainingTime = travel.arrivalTime.getTime() - nowTime;
                        const extraTime = remainingTime * (staminaConfig.EXHAUSTED_TRAVEL_TIME_MULTIPLIER - 1);
                        travel.arrivalTime = new Date(travel.arrivalTime.getTime() + extraTime);
                    }
                    travel.exhaustPenaltyApplied = true;
                }
                await travel.save();
                await playerPre.save();
            }
        }`);

// Remove inner transaction duplicate drains
worldContent = worldContent.replace(`const player = await Player.findOne({ discordId: userId }).session(session);
            if (player) { applyTravelDrain(player, travel); await player.save({ session }); await travel.save({ session }); }`, "const player = await Player.findOne({ discordId: userId }).session(session);");
worldContent = worldContent.replace(`const player = await Player.findOne({ discordId: userId }).session(session);
            if (player) { applyTravelDrain(player, travel); await player.save({ session }); await travel.save({ session }); }`, "const player = await Player.findOne({ discordId: userId }).session(session);");

// Fix ambush in rest
const ambushLogic = `
            // Rest Ambush logic
            const ambushChancePerHour = isTent ? staminaConfig.REST_AMBUSH_CHANCE_PER_HOUR_TENT : staminaConfig.REST_AMBUSH_CHANCE_PER_HOUR_OPEN;
            const fullHours = Math.floor(hoursElapsed);
            let ambushed = false;

            for (let i = 0; i < fullHours; i++) {
                 if (Math.random() < ambushChancePerHour) {
                      ambushed = true;
                      break;
                 }
            }

            if (ambushed) {
                 player.rest.status = 'idle';
                 player.rest.mode = null;

                 // Small penalty
                 const { payCurrency } = require('../../utils/currency');
                 const penaltyCopper = 250;
                 if (player.currency.copper >= penaltyCopper) {
                      payCurrency(player.currency, penaltyCopper, 'copper');
                 } else {
                      player.currency.copper = 0;
                 }

                 await TransactionLog.create([{
                      guildId: player.guildId,
                      type: 'rest_ambush_loss',
                      description: \`[\${player.characterName}] diganggu saat istirahat dan kehilangan sebagian harta.\`,
                      amount: penaltyCopper,
                      currency: 'copper'
                 }]);
            }
`;

worldContent = worldContent.replace(
    "player.currentHp = Math.min(maxHp, Math.floor(player.currentHp + hpGain));\n            }",
    `player.currentHp = Math.min(maxHp, Math.floor(player.currentHp + hpGain));\n            }\n${ambushLogic}`
);

// Second endpoint
worldContent = worldContent.replace(
    "player.currentHp = Math.min(maxHp, Math.floor(player.currentHp + hpGain));\n            }\n        }",
    `player.currentHp = Math.min(maxHp, Math.floor(player.currentHp + hpGain));\n            }\n${ambushLogic}\n        }`
);

fs.writeFileSync('web-api/routes/world.js', worldContent);

// Fix git lock files
// git checkout web-dashboard/package.json web-dashboard/package-lock.json
