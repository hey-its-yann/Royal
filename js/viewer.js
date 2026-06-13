// 1. Telegram Integration & Watermark
const tg = window.Telegram.WebApp;
tg.expand();

const user = tg.initDataUnsafe?.user || { id: '000000', first_name: 'Student' };
const watermarkContainer = document.getElementById('watermark-overlay');

function generateWatermark() {
    const watermarkString = `Royal Library | ${user.first_name} | ID: ${user.id}   `;
    let html = '';
    for (let i = 0; i < 70; i++) {
        html += `<div class="watermark-text">${watermarkString}</div>`;
    }
    watermarkContainer.innerHTML = html;
}
generateWatermark();

// Home Button Logic
document.getElementById('home-btn').addEventListener('click', () => {
    window.location.href = "index.html";
});

// 2. File Routing
const urlParams = new URLSearchParams(window.location.search);
const requestedFile = urlParams.get('file');

if (!requestedFile) {
    alert("لم يتم تحديد ملف! جاري العودة للرئيسية...");
    window.location.href = "index.html"; 
}
const url = `assets/${requestedFile}`; 

// 3. PDF.js Configuration
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let pdfDoc = null, pageNum = 1, pageIsRendering = false, pageNumIsPending = null,
    scale = 1.0, canvas = document.getElementById('pdf-render'), ctx = canvas.getContext('2d');

const fixedScales = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

// 4. Render Logic
const renderPage = num => {
    pageIsRendering = true;
    pdfDoc.getPage(num).then(page => {
        const renderScale = 2.0; 
        const viewport = page.getViewport({ scale: renderScale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.width = `${(viewport.width / renderScale) * scale}px`;

        const renderCtx = { canvasContext: ctx, viewport: viewport };
        page.render(renderCtx).promise.then(() => {
            pageIsRendering = false;
            if (pageNumIsPending !== null) { renderPage(pageNumIsPending); pageNumIsPending = null; }
        });

        document.getElementById('page-jump-btn').textContent = num;
    });
};

const queueRenderPage = num => {
    if (pageIsRendering) pageNumIsPending = num;
    else renderPage(num);
};

// 5. Auto-Hide & Tap-to-Toggle Toolbars
let barsVisible = true;
let hideTimeout;

const showBars = () => {
    document.querySelector('.toolbar').classList.remove('hidden');
    document.querySelector('.bottom-bar').classList.remove('hidden');
    barsVisible = true;
    resetHideTimer();
};

const hideBars = () => {
    document.querySelector('.toolbar').classList.add('hidden');
    document.querySelector('.bottom-bar').classList.add('hidden');
    barsVisible = false;
    clearTimeout(hideTimeout);
};

const resetHideTimer = () => {
    clearTimeout(hideTimeout);
    if (barsVisible) hideTimeout = setTimeout(hideBars, 3500);
};

// Tap anywhere on the PDF container to toggle bars
document.getElementById('pdf-container').addEventListener('click', (e) => {
    if (barsVisible) hideBars();
    else showBars();
});
showBars(); // Initialize

// 6. Navigation Controls (Inverted Functions)
document.getElementById('prev-page').addEventListener('click', () => {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
    showBars();
});

document.getElementById('next-page').addEventListener('click', () => {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
    showBars();
});

// 7. Page Grid Modal
const modal = document.getElementById('page-grid-modal');
const gridContainer = document.getElementById('page-grid-container');

document.getElementById('page-jump-btn').addEventListener('click', () => {
    gridContainer.innerHTML = ''; 
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = 'grid-page-btn';
        if (i === pageNum) btn.classList.add('active');
        btn.addEventListener('click', () => {
            pageNum = i;
            queueRenderPage(pageNum);
            modal.classList.add('hidden');
            showBars();
        });
        gridContainer.appendChild(btn);
    }
    modal.classList.remove('hidden');
});

document.getElementById('close-modal').addEventListener('click', () => {
    modal.classList.add('hidden');
});

// 8. Fixed Zoom Controls
function getClosestScaleIndex() {
    let closest = 0, minDiff = Infinity;
    fixedScales.forEach((s, i) => {
        let diff = Math.abs(scale - s);
        if (diff < minDiff) { minDiff = diff; closest = i; }
    });
    return closest;
}

document.getElementById('zoom-in').addEventListener('click', (e) => {
    e.stopPropagation(); // Stop PDF container tap from firing
    let idx = getClosestScaleIndex();
    if (idx < fixedScales.length - 1) {
        scale = fixedScales[idx + 1];
        document.getElementById('zoom-level').textContent = `${Math.round(scale * 100)}%`;
        queueRenderPage(pageNum);
    }
    resetHideTimer();
});

document.getElementById('zoom-out').addEventListener('click', (e) => {
    e.stopPropagation();
    let idx = getClosestScaleIndex();
    if (idx > 0) {
        scale = fixedScales[idx - 1];
        document.getElementById('zoom-level').textContent = `${Math.round(scale * 100)}%`;
        queueRenderPage(pageNum);
    }
    resetHideTimer();
});

// 9. Touch Gestures (Isolating Pinch vs Swipe, Inverted Swipe)
let touchStartX = 0, touchEndX = 0, initialDistance = null, initialScale = scale;
let isPinching = false;

document.getElementById('pdf-container').addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
        touchStartX = e.changedTouches[0].screenX;
    } else if (e.touches.length === 2) {
        isPinching = true;
        initialDistance = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        initialScale = scale;
    }
});

document.getElementById('pdf-container').addEventListener('touchmove', e => {
    if (e.touches.length === 2 && initialDistance) {
        e.preventDefault(); 
        const currentDistance = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        const zoomFactor = currentDistance / initialDistance;
        scale = Math.min(Math.max(0.5, initialScale * zoomFactor), 3.0); 
        canvas.style.width = `${(canvas.width / 2.0) * scale}px`;
    }
});

document.getElementById('pdf-container').addEventListener('touchend', e => {
    if (e.changedTouches.length === 1 && !isPinching) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }
    if (e.touches.length < 2) {
        initialDistance = null; 
        document.getElementById('zoom-level').textContent = `${Math.round(scale * 100)}%`;
        // Delay resetting the pinch flag to avoid triggering a swipe right after zooming out
        setTimeout(() => { isPinching = false; }, 150); 
    }
});

function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) { 
        // Swiped Left - Inverted to Previous
        if (pageNum > 1) { pageNum--; queueRenderPage(pageNum); showBars(); }
    }
    if (touchEndX > touchStartX + swipeThreshold) { 
        // Swiped Right - Inverted to Next
        if (pageNum < pdfDoc.numPages) { pageNum++; queueRenderPage(pageNum); showBars(); }
    }
}

// 10. Load Document & Security
pdfjsLib.getDocument({ url: url }).promise.then(pdfDoc_ => {
    pdfDoc = pdfDoc_;
    document.getElementById('page-count').textContent = pdfDoc.numPages;
    renderPage(pageNum);
}).catch(err => {
    console.error("Error loading PDF: ", err);
    alert("حدث خطأ أثناء تحميل الملف.");
});

document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function(e) {
    if(e.keyCode == 123 || (e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) || 
      (e.ctrlKey && e.shiftKey && e.keyCode == 'C'.charCodeAt(0)) || (e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) || 
      (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) || (e.ctrlKey && e.keyCode == 'P'.charCodeAt(0))) { return false; }
};
