"use strict";
/**
 * @type {HTMLFormElement}
 */
const form = document.getElementById("uv-form");
/**
 * @type {HTMLInputElement}
 */
const address = document.getElementById("uv-address");
/**
 * @type {HTMLInputElement}
 */
const searchEngine = document.getElementById("uv-search-engine");
/**
 * @type {HTMLParagraphElement}
 */
const error = document.getElementById("uv-error");
/**
 * @type {HTMLPreElement}
 */
const errorCode = document.getElementById("uv-error-code");
const connection = new BareMux.BareMuxConnection("/baremux/worker.js")

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    let frame = document.getElementById("uv-frame");
    let search_bar = document.getElementById("uv-form");
    let is_search_bar = search_bar.dataset.isSearchBar === "true";

    try {
        await registerSW();
    } catch (err) {
        error.textContent = "Failed to register service worker.";
        errorCode.textContent = err.toString();
        throw err;
    }

    const url = search(address.value, searchEngine.value);

    if (is_search_bar) {
        let proxied_wrapper = document.getElementById("proxied-content-wrapper");
        proxied_wrapper.classList.replace("none", "fullscreen");


        let omnibox_wrapper = document.getElementById("omnibox-wrapper");
        omnibox_wrapper.appendChild(search_bar);
        search_bar.classList.add("omnibox");
        search_bar.dataset.isSearchBar = "false";
    }

    let wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
    if (await connection.getTransport() !== "/epoxy/index.mjs") {
        await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
    }
    frame.src = __uv$config.prefix + __uv$config.encodeUrl(url);
});
