const navbar = document.querySelector('.navbar');
const notch = document.querySelector('.notch');
const frame = document.getElementById('uv-frame');
let hideTimer;
let isIframeLoaded = false;

// yummy event listeners 
frame.addEventListener('load', () => {
    isIframeLoaded = true;
    navbar.classList.add('hidden');
});

notch.addEventListener('mouseenter', () => {
    if (isIframeLoaded) {
        navbar.classList.remove('hidden');
        notch.classList.add("no-pointer-events");
    }
});

navbar.addEventListener('mouseenter', () => {
    clearTimeout(hideTimer);
});

navbar.addEventListener('mouseleave', startHideTimer);

function startHideTimer() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        if (isIframeLoaded) {
            navbar.classList.add('hidden');
        }
        notch.classList.remove("no-pointer-events")
    }, 500);
}

document.addEventListener('touchstart', (e) => {
    if (e.touches[0].clientY < navbar.offsetHeight) {
        if (isIframeLoaded) {
            navbar.classList.remove('hidden');
        }
    }
});