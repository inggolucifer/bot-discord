/**
 * Test Modal Stack logic & Z-Index calculation
 * Deterministic test verifying:
 * - Opening A -> A is top, z-index 60, backdrop 50
 * - Opening B -> B is top (z 62), A is not top (z 60)
 * - Re-registering A -> A moves to top (z 62)
 * - Closing top modal -> previous modal becomes top
 * - Empty stack behavior
 */

const assert = require('assert');

class ModalStackModel {
  constructor() {
    this.stack = [];
  }

  register(id, onClose) {
    this.stack = this.stack.filter(entry => entry.id !== id);
    this.stack.push({ id, onClose });
  }

  unregister(id) {
    this.stack = this.stack.filter(entry => entry.id !== id);
  }

  isTopModal(id) {
    if (this.stack.length === 0) return false;
    return this.stack[this.stack.length - 1].id === id;
  }

  getZIndex(id) {
    const index = this.stack.findIndex(entry => entry.id === id);
    if (index === -1) return 60;
    return 60 + index * 2;
  }

  getBackdropZIndex(id) {
    const index = this.stack.findIndex(entry => entry.id === id);
    if (index === -1) return 50;
    return 50 + index * 2;
  }

  handleEscape() {
    if (this.stack.length === 0) return false;
    const top = this.stack[this.stack.length - 1];
    if (top && typeof top.onClose === 'function') {
      top.onClose();
      return true;
    }
    return false;
  }

  get stackSize() {
    return this.stack.length;
  }
}

async function runTests() {
  console.log('--- Testing ModalManager Logic ---');

  const model = new ModalStackModel();

  // Test 1: Initial empty state
  assert.strictEqual(model.stackSize, 0, 'Initial stack should be empty');
  assert.strictEqual(model.isTopModal('modalA'), false, 'No top modal when empty');
  assert.strictEqual(model.getZIndex('modalA'), 60, 'Fallback z-index 60');
  assert.strictEqual(model.getBackdropZIndex('modalA'), 50, 'Fallback backdrop z-index 50');
  console.log('✓ Test 1: Empty stack state passed');

  // Test 2: Register modal A
  let aClosed = false;
  model.register('modalA', () => { aClosed = true; });
  assert.strictEqual(model.stackSize, 1);
  assert.strictEqual(model.isTopModal('modalA'), true, 'modalA should be top modal');
  assert.strictEqual(model.getZIndex('modalA'), 60, 'modalA z-index should be 60');
  assert.strictEqual(model.getBackdropZIndex('modalA'), 50, 'modalA backdrop z-index should be 50');
  console.log('✓ Test 2: Single modal A registration passed');

  // Test 3: Register modal B
  let bClosed = false;
  model.register('modalB', () => { bClosed = true; });
  assert.strictEqual(model.stackSize, 2);
  assert.strictEqual(model.isTopModal('modalB'), true, 'modalB should be top modal');
  assert.strictEqual(model.isTopModal('modalA'), false, 'modalA should not be top modal');
  assert.strictEqual(model.getZIndex('modalA'), 60, 'modalA z-index remains 60');
  assert.strictEqual(model.getZIndex('modalB'), 62, 'modalB z-index should be 62');
  assert.strictEqual(model.getBackdropZIndex('modalB'), 52, 'modalB backdrop should be 52');
  console.log('✓ Test 3: Stacked modal B with higher z-index passed');

  // Test 4: Escape only closes top modal (modalB)
  const escapeHandled = model.handleEscape();
  assert.strictEqual(escapeHandled, true);
  assert.strictEqual(bClosed, true, 'modalB onClose callback triggered');
  assert.strictEqual(aClosed, false, 'modalA onClose callback NOT triggered');
  console.log('✓ Test 4: Escape key only targets topmost modal passed');

  // Test 5: Unregister modal B -> modal A becomes top again
  model.unregister('modalB');
  assert.strictEqual(model.stackSize, 1);
  assert.strictEqual(model.isTopModal('modalA'), true, 'modalA is top again');
  assert.strictEqual(model.getZIndex('modalA'), 60);
  console.log('✓ Test 5: Top modal removal restores previous modal as top passed');

  // Test 6: Re-registering an existing modal moves it to the top
  model.register('modalC');
  assert.strictEqual(model.isTopModal('modalC'), true);
  model.register('modalA'); // Bring modalA to front
  assert.strictEqual(model.stackSize, 2, 'Re-registering does not duplicate entry');
  assert.strictEqual(model.isTopModal('modalA'), true, 'modalA is moved to top');
  assert.strictEqual(model.getZIndex('modalA'), 62, 'modalA promoted to top z-index');
  assert.strictEqual(model.getZIndex('modalC'), 60, 'modalC demoted to lower z-index');
  console.log('✓ Test 6: Re-registering existing modal promotes to top passed');

  console.log('\nALL 6 MODAL MANAGER LOGIC TESTS PASSED!\n');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
