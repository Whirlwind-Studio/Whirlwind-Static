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
const bookmark_id_prefix = "bookmark_whirlwind_";
let bookmarks;

bookmark_star.addEventListener("click", function () {
    let favicon = get_favicon_html(frame.contentDocument);
    if (favicon === null) {
        favicon = (new URL(decodeURL(frame.contentWindow.location.href))).origin + "/favicon.ico";
    }
    let x = { favicon_url: favicon, name: frame.contentDocument.title, url: decodeURL(frame.contentWindow.location.href) };
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

        frame.contentDocument.addEventListener("dragover", function (e) {
            e.preventDefault();
        })

        frame.contentDocument.addEventListener("drop", function (e) {
            e.preventDefault();
            formSubmit(null, e.dataTransfer.getData("text/plain"));
        })
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

address.addEventListener("drop", function (e) {
    e.preventDefault();
    address.value = e.dataTransfer.getData("text/plain");
});
address.addEventListener("dragenter", function (e) {
    e.preventDefault();
    address.select();
});

address.addEventListener("dragleave", function (e) {
    e.preventDefault();
    document.getSelection().removeAllRanges();
});

function divider(x) {
    return `<span class="bookmark-divider vhidden" id="divider_${x}"><svg id="chart" width="0.25rem" height="2rem"><line x1="0" y1="0" x2="0" y2="32" class="vertical-bar"></line></svg></span>`;
}

function listenersForDivider(el) {
    el.addEventListener("dragenter", function (e) {
        console.log(`entered divider ${el.id}`);
        e.preventDefault();
        el.classList.remove("vhidden");
    });
    el.addEventListener("drop", function (e) {
        e.preventDefault();
    });
    el.addEventListener("dragleave", function (e) {
        e.preventDefault();
        el.classList.add("vhidden");
    });
}

function updateBookmarks(storage, input_bookmarks) {
    if (storage.getItem("bookmarks") === null) {
        storage.setItem("bookmarks", "[]");
    }
    if (input_bookmarks ?? false) {
        storage.setItem("bookmarks", JSON.stringify(input_bookmarks));
    }
    bookmarks = JSON.parse(storage.getItem("bookmarks"));
    bookmarks_wrapper.innerHTML = divider(0);

    for (let [i, x] of enumerate(bookmarks)) {

        let el = document.createElement("span");
        el.classList.add("bookmark");
        el.draggable = true;

        let img = document.createElement("img");
        img.alt = "bookmark favicon";
        img.classList.add("bookmark-favicon");
        img.classList.add("bookmark-favicon-waiting");
        img.draggable = false;

        el.appendChild(img);
        el.insertAdjacentText("beforeend", x.name);
        el.dataset.url = x.url;
        el.id = `${bookmark_id_prefix}${i}`

        el.addEventListener("dragstart", function (e) {
            e.currentTarget.classList.add("dragging");
            e.dataTransfer.clearData();
            e.dataTransfer.setData("text/plain", e.target.dataset.url);
            e.dataTransfer.setData("text/id", e.target.id);

            // This is needed because during drag events the data is always empty string but the type is visible
            e.dataTransfer.setData(`text/whirlwind_bookmark_id__${e.target.id}`, "")
        });
        el.addEventListener("dragend", function (e) {
            e.currentTarget.classList.remove("dragging");
        });

        let loader = document.createElement("iframe");
        loader.src = encodeURL(x.favicon_url);
        loader.onload = () => getFavicons(loader, img, el);
        document.getElementById("favicon-loaders").appendChild(loader);

        bookmarks_wrapper.appendChild(el);
        bookmarks_wrapper.insertAdjacentHTML("beforeend", divider(i + 1));
        el.onclick = () => formSubmit(null, el.dataset.url);
    }
    bookmarks_wrapper.addEventListener("dragover", function (e) {
        e.preventDefault();
        findClosest(e, function (closest, closestDistance, closestDimensions) {
            findDividerTarget(closestDistance, e, closest, () => closest.classList.remove("vhidden"));
        });
    });
    bookmarks_wrapper.addEventListener("dragleave", function(e) {
        for (let x of document.getElementsByClassName("bookmark-divider")) {
            x.classList.add("vhidden");
        }
    });
    bookmarks_wrapper.addEventListener("drop", function (e) {
        findClosest(e, function (closest, closestDistance) {
            findDividerTarget(closestDistance, e, closest, function (e, closest, origin) {
                let i = parseInt(origin.id.substring(bookmark_id_prefix.length));
                array_move(bookmarks, i, parseInt(closest.id.substring("divider_".length)));
                updateBookmarks(window.localStorage, bookmarks);
            });
        });
    })
}

function array_move(arr, old_index, new_index) {
    if (old_index < new_index) {
        new_index -= 1;
    }
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
    return arr;
}

function findDividerTarget(closestDistance, e, closest, callback) {
    if (closestDistance < Math.hypot(e.target.clientWidth, e.target.clientHeight)) {
        let x = null;
        for (let tmp of e.dataTransfer.types) {
            if (tmp.startsWith("text/whirlwind_bookmark_id__")) {
                x = document.getElementById(tmp.substring("text/whirlwind_bookmark_id__".length));
            }
        }
        if (!(x.previousElementSibling.id == closest.id
            || x.nextElementSibling.id == closest.id))
            callback(e, closest, x);
    }
}

function findClosest(e, callback) {
    let closest = null;
    let closestDistance = Infinity;
    let closestDimensions = null;
    for (let divider of document.getElementsByClassName("bookmark-divider")) {
        divider.classList.add("vhidden");
        let box = divider.getBoundingClientRect();
        let x = (box.left + box.right) / 2;
        let y = (box.top + box.bottom) / 2;
        let distance = Math.hypot(e.clientX - x, e.clientY - y);
        if (distance < closestDistance) {
            closestDistance = distance;
            closest = divider;
            closestDimensions = box;
        }
    }
    if (closest !== null) {
        callback(closest, closestDistance, closestDimensions);
    }
}

function getFavicons(loader, img, el) {
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
                document.getElementById(el.id).innerHTML = el.innerHTML;
            }
            loader.remove();
        });
    } catch (error) {
        console.warn("failed to load favicon (cross platform issue?)");
        console.log(error);
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