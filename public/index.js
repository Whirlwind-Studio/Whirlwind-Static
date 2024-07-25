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
const proxied_wrapper = document.getElementById("proxied-content-wrapper");
const omnibox_wrapper = document.getElementById("omnibox-wrapper");
const bookmarks_wrapper = document.getElementById("bookmarks-wrapper");

const bookmarks_enabled_by_default = false;

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

    let wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";
    if (await connection.getTransport() !== "/epoxy/index.mjs") {
        await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
    }

    if (is_search_bar) {
        transitionToOmnibox();
    }

    frame.src = encodeURL(url);
    if (!loading_animation.classList.contains("none")) {
        iFrameReady(frame, () => {
            frame.classList.add("loaded-frame");
            loading_animation.classList.add("none");
        }, true);
    }
}

function transitionToOmnibox() {
    proxied_wrapper.classList.replace("none", "fullscreen");

    omnibox_wrapper.appendChild(form);
    form.classList.add("omnibox");
    form.dataset.isSearchBar = "false";

    notch.classList.add("none");
    navbar.classList.add("none");

    omnibox_wrapper.appendChild(settings);
    
    let storage = window.localStorage;
    let bookmarks_enabled = storage.getItem("bookmarksEnabled");

    if (bookmarks_enabled === "true") {
        proxied_wrapper.classList.add("with-bookmarks");
    } else if (bookmarks_enabled === "false") {
        proxied_wrapper.classList.remove("with-bookmarks");
    } else {
        storage.setItem("bookmarksEnabled", bookmarks_enabled_by_default);
        if (bookmarks_enabled_by_default) {
            proxied_wrapper.classList.add("with-bookmarks");
        } else {
            proxied_wrapper.classList.remove("with-bookmarks");
        }
    }

    updateBookmarks(storage);
    
}


function updateBookmarks(storage) {
    if (storage.getItem("bookmarks") === null) {
        storage.setItem("bookmarks", "[]");
    }

    let bookmarks = JSON.parse(storage.getItem("bookmarks"));
    for (let x of bookmarks) {
        let el = document.createElement("span");
        el.classList.add("bookmark");

        let img = document.createElement("img");
        img.alt = "bookmark favicon";
        img.classList.add("bookmark-favicon");
        img.classList.add("bookmark-favicon-waiting");

        el.appendChild(img);
        el.innerHTML += x.name;
        el.dataset.url = x.url;

        let loader = document.createElement("iframe");
        loader.src = encodeURL(x.favicon_url);
        loader.onload = function () {
            try {
                let image = loader.contentDocument.getElementsByTagName("img")[0];
                let c = document.createElement("canvas");
                c.width = image.naturalWidth;
                c.height = image.naturalHeight;
                c.getContext("2d").drawImage(image, 0, 0);
                c.toBlob(function (blob) {
                    if (blob !== null) {
                        img.src = URL.createObjectURL(blob);
                        el.removeChild(el.firstChild);
                        el.insertBefore(img, el.firstChild)
                    }
                })
            } catch {
                console.warn("failed to load favicon (cross platform issue?)")
            }
        }
        document.getElementById("favicon-loaders").appendChild(loader);
        bookmarks_wrapper.appendChild(el);
        el.onclick = () => formSubmit(null, el.dataset.url);
    }
}

function encodeURL(url) {
    return __uv$config.prefix + __uv$config.encodeUrl(url);
}

function decodeURL(url) {
    return __uv$config.decodeUrl(url.split(__uv$config.prefix)[1]);
}

function* enumerate (it, start = 0)
{ let i = start
  for (const x of it)
    yield [i++, x]
}