function escapeRegex(string) {
    if (typeof string !== 'string') return string;
    return string.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
