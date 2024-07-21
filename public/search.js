"use strict";
/**
 *
 * @param {string} input
 * @param {string} template Template for a search query.
 * @returns {url: string, was_search: boolean} url: Fully qualified URL, was_search: query interpreted as a search
 */
function search(input, template) {
    try {
        // input is a valid URL:
        // eg: https://example.com, https://example.com/test?q=param
        return { url: new URL(input).toString(), was_search: false };
    } catch (err) {
        // input was not a valid URL
    }

    try {
        // input is a valid URL when http:// is added to the start:
        // eg: example.com, https://example.com/test?q=param
        const url = new URL(`http://${input}`);
        // only if the hostname has a TLD/subdomain
        if (url.hostname.includes(".")) return { url: url.toString(), was_search: false };
    } catch (err) {
        // input was not valid URL
    }

    // input may have been a valid URL, however the hostname was invalid

    // Attempts to convert the input to a fully qualified URL have failed
    // Treat the input as a search query
    return { url: template.replace("%s", encodeURIComponent(input)), was_search: true };
}
