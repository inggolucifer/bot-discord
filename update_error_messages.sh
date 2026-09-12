#!/bin/bash

# Update web-api/routes/equipment.js
sed -i "s/const { getRealmIndex } = require('\.\.\/\.\.\/utils\/cultivation');/const { getRealmIndex, getRealmName } = require('\.\.\/\.\.\/utils\/cultivation');/g" jianghu-bot/web-api/routes/equipment.js
sed -i 's/\`Item ini membutuhkan minimal Realm Index \${minRealmIdx}, realm-mu saat ini \${playerRealmIdx}.\`/\`Item ini membutuhkan minimal **\${getRealmName(minRealmIdx)}**, realm-mu saat ini masih **\${getRealmName(playerRealmIdx)}**.\`/g' jianghu-bot/web-api/routes/equipment.js

# Update web-api/routes/pve.js
sed -i "s/const { getRealmIndex } = require('\.\.\/\.\.\/utils\/cultivation');/const { getRealmIndex, getRealmName } = require('\.\.\/\.\.\/utils\/cultivation');/g" jianghu-bot/web-api/routes/pve.js
sed -i 's/\`Kultivasi tidak cukup kuat untuk wilayah ini. Butuh minimal Realm Index \${location.minRealmLevel}.\`/\`Kultivasi tidak cukup kuat untuk wilayah ini. Butuh minimal **\${getRealmName(location.minRealmLevel)}**.\`/g' jianghu-bot/web-api/routes/pve.js

# Update web-api/routes/sect.js
sed -i "s/const { getRealmIndex } = require('\.\.\/\.\.\/utils\/cultivation');/const { getRealmIndex, getRealmName } = require('\.\.\/\.\.\/utils\/cultivation');/g" jianghu-bot/web-api/routes/sect.js
sed -i 's/\`Aset ini membutuhkan minimal Realm Index \${minRealmIdx}, realm-mu saat ini \${playerRealmIdx}.\`/\`Aset ini membutuhkan minimal **\${getRealmName(minRealmIdx)}**, realm-mu saat ini masih **\${getRealmName(playerRealmIdx)}**.\`/g' jianghu-bot/web-api/routes/sect.js

# Update services/player/asset/bangunAsset.js
sed -i "s/const { getRealmIndex } = require('\.\.\/\.\.\/\.\.\/utils\/cultivation');/const { getRealmIndex, getRealmName } = require('\.\.\/\.\.\/\.\.\/utils\/cultivation');/g" jianghu-bot/services/player/asset/bangunAsset.js
sed -i 's/\`❌ "\\${asset.name}" membutuhkan minimal Realm Index ${minRealmIdx}, realm-mu saat ini ${playerRealmIdx}.\`/\`❌ "\\${asset.name}" membutuhkan minimal **\${getRealmName(minRealmIdx)}**, realm-mu saat ini masih **\${getRealmName(playerRealmIdx)}**.\`/g' jianghu-bot/services/player/asset/bangunAsset.js

# Update services/player/sekte/sekteBangunAsset.js
sed -i "s/const { getRealmIndex } = require('\.\.\/\.\.\/\.\.\/utils\/cultivation');/const { getRealmIndex, getRealmName } = require('\.\.\/\.\.\/\.\.\/utils\/cultivation');/g" jianghu-bot/services/player/sekte/sekteBangunAsset.js
sed -i 's/\`❌ "\\${asset.name}" membutuhkan minimal Realm Index ${minRealmIdx}, realm-mu saat ini ${playerRealmIdx}.\`/\`❌ "\\${asset.name}" membutuhkan minimal **\${getRealmName(minRealmIdx)}**, realm-mu saat ini masih **\${getRealmName(playerRealmIdx)}**.\`/g' jianghu-bot/services/player/sekte/sekteBangunAsset.js

# Update services/player/sekte/sekteKelolaAnggota.js
sed -i "s/const { getRealmIndex } = require('\.\.\/\.\.\/\.\.\/utils\/cultivation');/const { getRealmIndex, getRealmName } = require('\.\.\/\.\.\/\.\.\/utils\/cultivation');/g" jianghu-bot/services/player/sekte/sekteKelolaAnggota.js
sed -i 's/\`❌ Jabatan Wakil Ketua membutuhkan minimal Realm Index 3. \${target.username} saat ini berada di Realm Index \${targetRealmIdx}.\`/\`❌ Jabatan Wakil Ketua membutuhkan minimal **\${getRealmName(3)}**. \${target.username} saat ini masih di **\${getRealmName(targetRealmIdx)}**.\`/g' jianghu-bot/services/player/sekte/sekteKelolaAnggota.js
sed -i 's/\`❌ Jabatan Tetua membutuhkan minimal Realm Index 2. \${target.username} saat ini berada di Realm Index \${targetRealmIdx}.\`/\`❌ Jabatan Tetua membutuhkan minimal **\${getRealmName(2)}**. \${target.username} saat ini masih di **\${getRealmName(targetRealmIdx)}**.\`/g' jianghu-bot/services/player/sekte/sekteKelolaAnggota.js

# Update commands/player/law.js
sed -i "s/const { getRealmIndex } = require('\.\.\/\.\.\/utils\/cultivation');/const { getRealmIndex, getRealmName } = require('\.\.\/\.\.\/utils\/cultivation');/g" jianghu-bot/commands/player/law.js
sed -i 's/\`❌ Hukum Alam \*\*\${lawToLearn.name}\*\* ini membutuhkan pemahaman setidaknya pada Realm Index \${minRealmIdx}, realm-mu saat ini \${realmIdx}.\`/\`❌ Hukum Alam \*\*\${lawToLearn.name}\*\* ini membutuhkan pemahaman setidaknya pada **\${getRealmName(minRealmIdx)}**, realm-mu saat ini masih **\${getRealmName(realmIdx)}**.\`/g' jianghu-bot/commands/player/law.js
sed -i '/\/\/ Kita sudah tidak membatasi ini hanya ke Mortal/d' jianghu-bot/commands/player/law.js
sed -i '/\/\/ Biarkan lewat dan dicek minRealmIndex-nya nanti/d' jianghu-bot/commands/player/law.js
sed -i '/\/\/ (Tapi kalau design lama beneran maunya cuma Mortal/d' jianghu-bot/commands/player/law.js
sed -i '/\/\/ Tapi karena instruksi bilang "Setiap Law punya batas realm"/d' jianghu-bot/commands/player/law.js
sed -i '/if (player.isNormalCultivator || realmIdx > 0) {/,/}/d' jianghu-bot/commands/player/law.js

# Update commands/player/manual.js
sed -i "s/const { getRealmIndex } = require('\.\.\/\.\.\/utils\/cultivation');/const { getRealmIndex, getRealmName } = require('\.\.\/\.\.\/utils\/cultivation');/g" jianghu-bot/commands/player/manual.js
sed -i 's/\`❌ Manual \*\*\${manualToLearn.name}\*\* ini membutuhkan pemahaman setidaknya pada Realm Index \${minRealmIdx}, realm-mu saat ini \${realmIdx}.\`/\`❌ Manual \*\*\${manualToLearn.name}\*\* ini membutuhkan pemahaman setidaknya pada **\${getRealmName(minRealmIdx)}**, realm-mu saat ini masih **\${getRealmName(realmIdx)}**.\`/g' jianghu-bot/commands/player/manual.js

# Update web-api/routes/inventory.js
sed -i "s/const { getRealmIndex } = require('\.\.\/\.\.\/utils\/cultivation');/const { getRealmIndex, getRealmName } = require('\.\.\/\.\.\/utils\/cultivation');/g" jianghu-bot/web-api/routes/inventory.js
sed -i 's/\`Hukum Alam \*\*\${lawToLearn.name}\*\* ini membutuhkan pemahaman setidaknya pada Realm Index \${minRealmIdx}, realm-mu saat ini \${realmIdx}.\`/\`Hukum Alam \*\*\${lawToLearn.name}\*\* ini membutuhkan pemahaman setidaknya pada **\${getRealmName(minRealmIdx)}**, realm-mu saat ini masih **\${getRealmName(realmIdx)}**.\`/g' jianghu-bot/web-api/routes/inventory.js
sed -i 's/\`Manual \*\*\${manualToLearn.name}\*\* ini membutuhkan pemahaman setidaknya pada Realm Index \${minRealmIdx}, realm-mu saat ini \${realmIdx}.\`/\`Manual \*\*\${manualToLearn.name}\*\* ini membutuhkan pemahaman setidaknya pada **\${getRealmName(minRealmIdx)}**, realm-mu saat ini masih **\${getRealmName(realmIdx)}**.\`/g' jianghu-bot/web-api/routes/inventory.js
sed -i '/\/\/ if (player.isNormalCultivator || realmIdx > 0) {/d' jianghu-bot/web-api/routes/inventory.js
sed -i '/\/\/    throw new CustomError('\''Terlambat! Tubuh fanamu sudah beradaptasi dengan Qi biasa. Kamu tidak bisa lagi mempelajari Hukum Alam (Hanya bisa di tahap Mortal).\'', 400);/d' jianghu-bot/web-api/routes/inventory.js
sed -i '/\/\/ }/d' jianghu-bot/web-api/routes/inventory.js

# Update web-api/routes/market.js
sed -i "s/const { getRealmIndex } = require('\.\.\/\.\.\/utils\/cultivation');/const { getRealmIndex, getRealmName } = require('\.\.\/\.\.\/utils\/cultivation');/g" jianghu-bot/web-api/routes/market.js
sed -i 's/\`Barang ini terlalu tinggi tingkatannya. Butuh minimal Realm Index \${minRealmIdx - 1} untuk membeli.\`/\`Barang ini terlalu tinggi tingkatannya. Butuh minimal **\${getRealmName(minRealmIdx - 1)}** untuk membeli.\`/g' jianghu-bot/web-api/routes/market.js
sed -i 's/\`Aset ini membutuhkan minimal Realm Index \${minRealmIdx}, realm-mu saat ini \${playerRealmIdx}.\`/\`Aset ini membutuhkan minimal **\${getRealmName(minRealmIdx)}**, realm-mu saat ini masih **\${getRealmName(playerRealmIdx)}**.\`/g' jianghu-bot/web-api/routes/market.js
sed -i 's/\`Barang ini terlalu tinggi tingkatannya. Butuh minimal Realm Index \${minRealmIdx - 1} untuk menawar.\`/\`Barang ini terlalu tinggi tingkatannya. Butuh minimal **\${getRealmName(minRealmIdx - 1)}** untuk menawar.\`/g' jianghu-bot/web-api/routes/market.js
