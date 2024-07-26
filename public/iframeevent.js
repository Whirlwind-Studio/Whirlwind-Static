// Code modified from https://stackoverflow.com/a/24603642 in the Further Edit section
// This function ONLY works for iFrames of the same origin as their parent
function iFrameReady(iFrame, fn, use_mutation) {
    let timer, fired = false;

    function ready() {
        if (!fired) {
            fired = true;
            clearTimeout(timer);
            fn.call(this);
        }
    }

    function readyState() {
        if (this.readyState === "complete") {
            ready.call(this);
        }
    }

    // use iFrame load as a backup - though the other events should occur first
    iFrame.addEventListener("load", function () {
        ready.call(iFrame.contentDocument);
    });

    function checkLoaded() {
        let doc = iFrame.contentDocument;
        // We can tell if there is a dummy document installed because the dummy document
        // will have an URL that starts with "about:".  The real document will not have that URL
        if (doc.URL.indexOf("about:") !== 0) {
            if (doc.readyState === "complete") {
                ready.call(doc);
            } else {
                // set event listener for DOMContentLoaded on the new document
                doc.addEventListener("DOMContentLoaded", ready);
                doc.addEventListener("readystatechange", readyState);
                // observe iFrame for first paint and first contentful paint
                if (use_mutation) {
                    let Observer = doc.defaultView.PerformanceObserver;
                    let obv = new Observer(function (x) {
                        if (x.getEntries().length > 0) {
                            ready.call(doc);
                        }
                    })
                    obv.observe({ type: "paint" });
                }
            }
        } else {
            // still same old original document, so keep looking for content or new document
            timer = setTimeout(checkLoaded, 1);
        }
    }
    checkLoaded();
}