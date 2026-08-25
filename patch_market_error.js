const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'jianghu-bot/web-dashboard/src/app/market/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// There's no success message state, and error is used for errors.
// Looking at other functions in market/page.tsx, maybe it just re-fetches and closes the modal.
// I'll add a 'message' state or just use 'alert' if there's no toast system.
// Wait, in handleBuy:
// } catch (err: any) {
//     setError(err.response?.data?.error || 'Gagal membeli item.');

// Let's add a general success message state if we want, or just alert.
// Actually, looking at handleBuy, it doesn't show a success message, it just closes modal and fetches data.
content = content.replace(
  `alert(res.data.message); // Temporarily using alert as a fallback, or better yet, since we have 'error' state, let's see if there is a 'message' state.`,
  `// No success message state exists in this component, just closing the modal is fine. (Or could add a state if needed)`
);

fs.writeFileSync(filePath, content);
