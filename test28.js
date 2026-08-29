// If item has characters like `(x)`, using `new RegExp('^' + nama + '$', 'i')` would crash if not escaped!
// Wait! Wait! Wait!
// "gabisa send item" -> maybe the item name contains special characters and regex crashes!
const badName = 'Sword (Rare)';
try {
  const re = new RegExp(`^${badName}$`, 'i');
  console.log("No crash", re);
} catch (e) {
  console.log("Crash!", e.message);
}

const badName2 = 'Sword [Rare]';
try {
  const re = new RegExp(`^${badName2}$`, 'i');
  console.log("No crash", re);
} catch (e) {
  console.log("Crash!", e.message);
}

const badName3 = 'Sword (Rare';
try {
  const re = new RegExp(`^${badName3}$`, 'i');
  console.log("No crash", re);
} catch (e) {
  console.log("Crash!", e.message);
}
