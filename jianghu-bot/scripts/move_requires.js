const fs = require('fs');

function moveRequires(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const requireRegex = /^(\s*)const\s+(?:\{\s*[^\}]+\s*\}|[a-zA-Z0-9_]+)\s*=\s*require\([^)]+\);/gm;
    let match;
    const requiresToInsert = [];

    // Parse requires to avoid duplicates and handle destructuring properly
    const moduleMap = new Map(); // module_path -> Set of destructured items OR default variable

    while ((match = requireRegex.exec(content)) !== null) {
        // Skip requires that are already top-level (no indentation)
        if (match[1] === '') continue;

        const fullMatch = match[0];
        const rawContent = fullMatch.trim();
        requiresToInsert.push(rawContent);
    }

    if (requiresToInsert.length > 0) {
        // Create a set to dedup exactly matching require statements
        const uniqueRequiresSet = new Set(requiresToInsert);

        // Remove matched requires that had indentation
        content = content.replace(requireRegex, (match, p1) => {
            return p1 === '' ? match : '';
        });

        // Collect existing top-level requires to prevent adding duplicates
        const existingRequiresRegex = /^const\s+(?:\{\s*[^\}]+\s*\}|[a-zA-Z0-9_]+)\s*=\s*require\([^)]+\);/gm;
        const existingRequires = new Set();
        let exMatch;
        while ((exMatch = existingRequiresRegex.exec(content)) !== null) {
            existingRequires.add(exMatch[0].trim());
        }

        // Filter out requires that already exist at top level
        const finalRequires = Array.from(uniqueRequiresSet).filter(req => !existingRequires.has(req));

        // Very basic variable deduplication (if a top-level const with same name exists, don't add it)
        const finalRequiresSafe = [];
        const declaredVars = new Set();

        // Find all top level consts
        const constRegex = /^const\s+([a-zA-Z0-9_]+)\s*=/gm;
        let cMatch;
        while ((cMatch = constRegex.exec(content)) !== null) {
            declaredVars.add(cMatch[1]);
        }

        finalRequires.forEach(req => {
            const varMatch = req.match(/const\s+([a-zA-Z0-9_]+)\s*=/);
            if (varMatch) {
                if (!declaredVars.has(varMatch[1])) {
                    finalRequiresSafe.push(req);
                    declaredVars.add(varMatch[1]);
                }
            } else {
                // It's a destructuring require, we should probably manually handle these or just append them and fix dupes manually
                finalRequiresSafe.push(req);
            }
        });

        const lines = content.split('\n');
        let insertIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('const ') || lines[i].startsWith('let ') || lines[i].startsWith('var ') || lines[i].startsWith('//')) {
                insertIndex = i + 1;
            } else if (lines[i].trim() === '' && i > 0 && (lines[i-1].startsWith('const') || lines[i-1].startsWith('//'))) {
                 insertIndex = i;
                 break;
            }
        }

        // Deduplicate destructuring
        const topRequires = Array.from(new Set(finalRequiresSafe)).join('\n') + '\n';
        lines.splice(insertIndex, 0, topRequires);

        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        console.log(`Moved requires in ${filePath}`);
    }
}

const targetFiles = [
    'jianghu-bot/web-api/routes/player.js',
    'jianghu-bot/web-api/routes/battle.js',
    'jianghu-bot/web-api/routes/inventory.js',
    'jianghu-bot/web-api/routes/pve.js',
    'jianghu-bot/web-api/routes/world.js'
];

targetFiles.forEach(file => moveRequires(file));
