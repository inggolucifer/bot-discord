/**
 * TEST SUITE: T4 - UNIFIED AVATAR RESOLUTION
 * Menguji helper resolvePlayerAvatar:
 * - Prioritas characterImage > avatarUrl > discordAvatar
 * - Mengabaikan URL embed placeholder Discord (/embed/avatars/)
 * - Mengabaikan string kosong / whitespace
 * - Mengembalikan null jika semua kosong
 */

const assert = require('assert');

// Implementasi yang sama dengan web-dashboard/src/lib/avatar.ts
function resolvePlayerAvatar(p) {
    if (!p) return null;
    const candidates = [p.characterImage, p.avatarUrl, p.discordAvatar];
    for (const url of candidates) {
        if (!url || typeof url !== 'string' || url.trim() === '') continue;
        if (url.includes('/embed/avatars/')) continue;
        return url;
    }
    return null;
}

console.log('\n=== TEST SUITE: T4 - UNIFIED AVATAR RESOLUTION ===\n');

let passed = 0;
let failed = 0;

function it(name, fn) {
    try {
        fn();
        console.log(`[PASS] ${name}`);
        passed++;
    } catch (err) {
        console.error(`[FAIL] ${name}:`, err.message);
        failed++;
    }
}

it('characterImage diprioritaskan di atas avatarUrl dan discordAvatar', () => {
    const res = resolvePlayerAvatar({
        characterImage: 'https://example.com/custom.png',
        avatarUrl: 'https://cdn.discordapp.com/avatars/123/abc.png',
        discordAvatar: 'https://cdn.discordapp.com/avatars/123/xyz.png'
    });
    assert.strictEqual(res, 'https://example.com/custom.png');
});

it('avatarUrl digunakan jika characterImage kosong/null', () => {
    const res = resolvePlayerAvatar({
        characterImage: null,
        avatarUrl: 'https://cdn.discordapp.com/avatars/123/abc.png',
        discordAvatar: 'https://cdn.discordapp.com/avatars/123/xyz.png'
    });
    assert.strictEqual(res, 'https://cdn.discordapp.com/avatars/123/abc.png');
});

it('Mengabaikan URL placeholder default Discord (/embed/avatars/)', () => {
    const res = resolvePlayerAvatar({
        characterImage: null,
        avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',
        discordAvatar: null
    });
    assert.strictEqual(res, null, 'Placeholder embed Discord harus diabaikan dan menghasilkan null');
});

it('Mengabaikan string kosong dan whitespace', () => {
    const res = resolvePlayerAvatar({
        characterImage: '   ',
        avatarUrl: '',
        discordAvatar: 'https://cdn.discordapp.com/avatars/123/real.png'
    });
    assert.strictEqual(res, 'https://cdn.discordapp.com/avatars/123/real.png');
});

it('Mengembalikan null jika semua field kosong atau objek null', () => {
    assert.strictEqual(resolvePlayerAvatar(null), null);
    assert.strictEqual(resolvePlayerAvatar(undefined), null);
    assert.strictEqual(resolvePlayerAvatar({}), null);
    assert.strictEqual(resolvePlayerAvatar({ characterImage: null, avatarUrl: null }), null);
});

console.log(`\n========================================`);
console.log(`HASIL: ${passed} LULUS, ${failed} GAGAL`);
console.log(`========================================\n`);

if (failed > 0) process.exit(1);
