/**
 * Converts a wildcard pattern to a standard regular expression.
 * Includes start/end anchors for exact matching.
 * @param {string} pattern The wildcard pattern.
 * @returns {RegExp} A RegExp object.
 */
export function wildcardToRegex(pattern) {
    const escaped = pattern.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    const regexString = '^' + escaped.replace(/\*/g, '.*') + '$';
    return new RegExp(regexString);
}
