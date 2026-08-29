function escapeRegex(string) {
    if (typeof string !== 'string') return string;
    // We only trim for the DB search, but wait, if the DB item has trailing spaces,
    // trimming the user input AND trimming the regex boundaries helps!
    // But actually, just letting escapeRegex do trim() is good!
    return string.trim().replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
