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
    let frame = document.getElementById("uv-frame");
    event.preventDefault();

    let is_search_bar = form.dataset.isSearchBar === "true";

    try {
        await registerSW();
    } catch (err) {
        error.textContent = "Failed to register service worker.";
        errorCode.textContent = err.toString();
        throw err;
    }

    let url = search(address.value, searchEngine.value).url;

    if (is_search_bar) {
        let proxied_wrapper = document.getElementById("proxied-content-wrapper");
        proxied_wrapper.classList.replace("none", "fullscreen");

        let omnibox_wrapper = document.getElementById("omnibox-wrapper");
        omnibox_wrapper.appendChild(form);
        form.classList.add("omnibox");
        form.dataset.isSearchBar = "false";

        document.getElementById("notch").classList.add("none");
        let navbar = document.getElementById("navbar");
        navbar.classList.add("none");

        let settings = navbar.getElementsByClassName("settings")[0];
        omnibox_wrapper.appendChild(settings)
    }

    let wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
    if (await connection.getTransport() !== "/epoxy/index.mjs") {
        await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
    }

    frame.src = __uv$config.prefix + __uv$config.encodeUrl(url);
});
let prevLocation = document.getElementById("uv-frame").contentDocument.location.href;
let x = setInterval(function () {
    let frame = document.getElementById("uv-frame");
    if (prevLocation != frame.contentDocument.location.href) {
        document.getElementById("uv-address").value = decodeURL(frame.contentDocument.location.href);
        prevLocation = frame.contentDocument.location.href;
    }
}, 50);
function decodeURL(url) {
    return __uv$config.decodeUrl(url.split(__uv$config.prefix)[1]);
}