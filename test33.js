const regex = /[.*+?^${}()|[\]\\]/g;
function escapeRegex(string) {
    if (typeof string !== 'string') return string;
    return string.replace(regex, '\\$&');
}

console.log(escapeRegex('Test [Name]'));
