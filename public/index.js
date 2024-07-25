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
const bookmark_star = document.getElementById("bookmark-star");
const bookmark_star_filled = document.getElementById("filled-star");

const bookmarks_enabled_by_default = false;
let bookmarks;

bookmark_star.addEventListener("click", function () {
    let favicon = get_favicon_html(frame.contentDocument);
    if (favicon === null) {
        favicon = (new URL(decodeURL(frame.contentWindow.location.href))).origin + "/favicon.ico";
    }
    let x = {favicon_url: favicon, name: frame.contentDocument.title, url: decodeURL(frame.contentWindow.location.href)};
    bookmarks.push(x);
    updateBookmarks(window.localStorage, bookmarks);
    bookmark_star.classList.add("none");
    bookmark_star_filled.classList.remove("none");
});

bookmark_star_filled.addEventListener("click", function () {
    let deletion = [];
    for (let x of bookmarks) {
        if (x.url == decodeURL(frame.contentWindow.location.href)) {
            deletion.push(x);
        }
    }
    for (let x of deletion) {
        let i;
        if ((i = bookmarks.indexOf(x)) !== -1) {
            bookmarks.splice(i, 1);
        }
    }
    
    updateBookmarks(window.localStorage, bookmarks);

    bookmark_star.classList.remove("none");
    bookmark_star_filled.classList.add("none");
})

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
        let state = false;
        for (let x of bookmarks) {
            state = state || x.url == address.value;
        }
        if (state) {
            bookmark_star.classList.add("none");
            bookmark_star_filled.classList.remove("none");
        } else {
            bookmark_star_filled.classList.add("none");
            bookmark_star.classList.remove("none");
        }
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
    bookmark_star.classList.remove("none");
}


function updateBookmarks(storage, input_bookmarks) {
    if (storage.getItem("bookmarks") === null) {
        storage.setItem("bookmarks", "[]");
    }
    if (input_bookmarks ?? false) {
        storage.setItem("bookmarks", JSON.stringify(input_bookmarks));
    }
    bookmarks = JSON.parse(storage.getItem("bookmarks"));
    bookmarks_wrapper.innerHTML = "";
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
                        img.classList.remove("bookmark-favicon-waiting");
                        el.removeChild(el.firstChild);
                        el.insertBefore(img, el.firstChild);
                        window.addEventListener("beforeunload", function () {
                            URL.revokeObjectURL(blob);
                        });
                    }
                    loader.remove();
                })
            } catch {
                console.warn("failed to load favicon (cross platform issue?)");
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

function* enumerate(it, start = 0) {
    let i = start;
    for (const x of it)
        yield [i++, x];
}
function get_favicon_html(doc) {
    let favicon = null;
    let nodeList = doc.getElementsByTagName("link");
    for (let element of nodeList) {
        if ((element.getAttribute("rel") == "icon") || (element.getAttribute("rel") == "shortcut icon")) {
            favicon = element.getAttribute("href");
        }
    }
    return favicon;
}