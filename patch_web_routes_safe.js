const fs = require('fs');

let filePlayerWeb = fs.readFileSync('jianghu-bot/web-api/routes/player.js', 'utf8');
const startIdxPlayer = filePlayerWeb.indexOf("router.post('/assets/claim-profit'");
if (startIdxPlayer !== -1) {
    let endIdx = filePlayerWeb.indexOf("});", startIdxPlayer);
    let openBrackets = 1;
    let currIdx = filePlayerWeb.indexOf("{", startIdxPlayer) + 1;

    while(openBrackets > 0 && currIdx < filePlayerWeb.length) {
         if(filePlayerWeb[currIdx] === '{') openBrackets++;
         if(filePlayerWeb[currIdx] === '}') openBrackets--;
         currIdx++;
    }

    // also remove the closing `);` of router.post
    currIdx = filePlayerWeb.indexOf(";", currIdx) + 1;

    filePlayerWeb = filePlayerWeb.slice(0, startIdxPlayer) + filePlayerWeb.slice(currIdx);
    fs.writeFileSync('jianghu-bot/web-api/routes/player.js', filePlayerWeb);
}

let fileSectWeb = fs.readFileSync('jianghu-bot/web-api/routes/sect.js', 'utf8');
const startIdxSect = fileSectWeb.indexOf("router.post('/assets/claim-profit'");
if (startIdxSect !== -1) {
    let endIdx = fileSectWeb.indexOf("});", startIdxSect);
    let openBrackets = 1;
    let currIdx = fileSectWeb.indexOf("{", startIdxSect) + 1;

    while(openBrackets > 0 && currIdx < fileSectWeb.length) {
         if(fileSectWeb[currIdx] === '{') openBrackets++;
         if(fileSectWeb[currIdx] === '}') openBrackets--;
         currIdx++;
    }

    // also remove the closing `);` of router.post
    currIdx = fileSectWeb.indexOf(";", currIdx) + 1;

    fileSectWeb = fileSectWeb.slice(0, startIdxSect) + fileSectWeb.slice(currIdx);
    fs.writeFileSync('jianghu-bot/web-api/routes/sect.js', fileSectWeb);
}
