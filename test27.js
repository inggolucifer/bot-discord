function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
console.log(escapeRegex('Test [Name]'));
