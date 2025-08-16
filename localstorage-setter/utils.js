/**
 * Converts a wildcard pattern to a regular expression.
 * @param {string} pattern The wildcard pattern.
 * @returns {RegExp} A RegExp object.
 * @throws {Error} if the pattern is invalid.
 */
export function wildcardToRegex(pattern) {
    // Escape all special regex characters.
    const escaped = pattern.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    // Replace the wildcard '*' with '.*' to match any characters, including none.
    const regexString = '^' + escaped.replace(/\*/g, '.*') + '$';
    return new RegExp(regexString);
}
