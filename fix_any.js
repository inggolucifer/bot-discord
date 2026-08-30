const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'jianghu-bot/web-dashboard/src/app/market/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix toast error (seems it was missing import if not defined, though I added it in handleSellToSystem)
// Let's check if there is an import
if (!content.includes('import { toast } from')) {
    // If we're missing toast, we'll just remove toast or use alert or add the import.
    // Wait, the original code had setError.
    content = content.replace("toast.success(res.data.message || 'Item berhasil dijual ke sistem.');",
    "alert(res.data.message || 'Item berhasil dijual ke sistem.');");
}

// Fix unknown type properties.
// The easiest way is to cast as error object, but since NextJS is strict, we can just replace 'err: unknown' with 'err: any'
// But wait, the previous ESLint error was specifically `@typescript-eslint/no-explicit-any`!
// So we must cast it carefully or define a custom type.
content = content.replace(/catch \(err: unknown\)/g, 'catch (err)');
content = content.replace(/err\.response\?\.data\?\.error/g, '(err as Error & { response?: { data?: { error?: string } } })?.response?.data?.error');

fs.writeFileSync(filePath, content);
console.log('Fixed types');
