"use strict";
const form = document.getElementById("uv-form");
const address = document.getElementById("uv-address");
const searchEngine = document.getElementById("uv-search-engine");
const error = document.getElementById("uv-error");
const errorCode = document.getElementById("uv-error-code");
const connection = new BareMux.BareMuxConnection("/baremux/worker.js")
const loading_animation = document.getElementById("loader");
const frame = document.getElementById("uv-frame");
const navbar = document.getElementById('navbar');
const notch = document.getElementById("notch");
const settings = document.getElementById("settings");
const reload = document.getElementById("reload");
const back = document.getElementById("back");
const forward = document.getElementById("forward");

form.addEventListener("submit", formSubmit);
reload.addEventListener("click", function () {
    formSubmit(null, decodeURL(frame.contentDocument.location.href));
});
back.addEventListener("click", function () {
    frame.contentWindow.history.back();
});

forward.addEventListener("click", function () {
    frame.contentWindow.history.forward();
})

let prevLocation = frame.contentDocument.location.href;
let x = setInterval(function () {
    if (prevLocation != frame.contentDocument.location.href) {
        address.value = decodeURL(frame.contentDocument.location.href);
        prevLocation = frame.contentDocument.location.href;
    }
}, 50);

async function formSubmit(event, input_url) {
    if (event ?? false) event.preventDefault();

    let is_search_bar = form.dataset.isSearchBar === "true";

    try {
        await registerSW();
    } catch (err) {
        error.textContent = "Failed to register service worker.";
        errorCode.textContent = err.toString();
        throw err;
    }

    let url = input_url ?? search(address.value, searchEngine.value).url;


    if (is_search_bar) {
        let proxied_wrapper = document.getElementById("proxied-content-wrapper");
        proxied_wrapper.classList.replace("none", "fullscreen");

        let omnibox_wrapper = document.getElementById("omnibox-wrapper");
        omnibox_wrapper.appendChild(form);
        form.classList.add("omnibox");
        form.dataset.isSearchBar = "false";

        notch.classList.add("none");
        navbar.classList.add("none");

        omnibox_wrapper.appendChild(settings);
    }

    let wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
    if (await connection.getTransport() !== "/epoxy/index.mjs") {
        await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
    }

    frame.src = __uv$config.prefix + __uv$config.encodeUrl(url);
    if (!loading_animation.classList.contains("none")) {
        iFrameReady(frame, () => {
            frame.classList.add("loaded-frame");
            loading_animation.classList.add("none");
        });
    }
}

function decodeURL(url) {
    return __uv$config.decodeUrl(url.split(__uv$config.prefix)[1]);
}

