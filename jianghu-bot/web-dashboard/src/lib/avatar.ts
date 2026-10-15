/**
 * Helper terpadu untuk resolusi avatar pemain (T4 Hotfix).
 * Urutan prioritas: characterImage -> avatarUrl (Discord asli) -> discordAvatar -> null.
 * Mengabaikan URL embed placeholder default Discord (/embed/avatars/).
 */

export function resolvePlayerAvatar(p?: {
    characterImage?: string | null;
    avatarUrl?: string | null;
    discordAvatar?: string | null;
} | null): string | null {
    if (!p) return null;
    const candidates = [p.characterImage, p.avatarUrl, p.discordAvatar];
    for (const url of candidates) {
        if (!url || typeof url !== 'string' || url.trim() === '') continue;
        if (url.includes('/embed/avatars/')) continue;
        return url;
    }
    return null;
}
