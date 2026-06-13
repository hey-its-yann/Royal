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

const urlParams = new URLSearchParams(window.location.search);
const requestedFile = urlParams.get('file');

if (!requestedFile) {
    alert("لم يتم تحديد ملف! جاري العودة للرئيسية...");
    window.location.href = "index.html"; 
}

const url = `assets/${requestedFile}`; 

const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let pdfDoc = null,
    pageNum = 1,
    pageIsRendering = false,
    pageNumIsPending = null,
    scale = 1.0, 
    canvas = document.getElementById('pdf-render'),
    ctx = canvas.getContext('2d');

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
            if (pageNumIsPending !== null) {
                renderPage(pageNumIsPending);
                pageNumIsPending = null;
            }
        });
        document.getElementById('page-jump-btn').textContent = num;
    });
};

const queueRenderPage = num => {
    if (pageIsRendering) pageNumIsPending = num;
    else renderPage(num);
};

// --- UI Tap to Toggle ---
const toggleBars = () => {
    document.querySelector('.toolbar').classList.toggle('hidden');
    document.querySelector('.bottom-bar').classList.toggle('hidden');
};
// Tap anywhere on the document container to show/hide
document.getElementById('pdf-container').addEventListener('click', toggleBars);

// --- Navigation ---
document.getElementById('prev-page').addEventListener('click', () => {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
});

document.getElementById('next-page').addEventListener('click', () => {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
});

// --- Zoom Controls (Select + Buttons) ---
const updateZoom = (newScale) => {
    scale = Math.min(Math.max(0.5, newScale), 3.0);
    document.getElementById('zoom-select').value = scale.toString();
    queueRenderPage(pageNum);
};

document.getElementById('zoom-select').addEventListener('change', (e) => {
    updateZoom(parseFloat(e.target.value));
});
document.getElementById('zoom-in').addEventListener('click', () => {
    updateZoom(scale + 0.25);
});
document.getElementById('zoom-out').addEventListener('click', () => {
    updateZoom(scale - 0.25);
});

// --- Touch Gestures ---
let touchStartX = 0;
let touchEndX = 0;
let initialDistance = null;
let initialScale = scale;
let isPinching = false; // Prevents swipe/pinch mixups

document.getElementById('pdf-container').addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
        touchStartX = e.changedTouches[0].screenX;
    } else if (e.touches.length === 2) {
        isPinching = true;
        initialDistance = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );
        initialScale = scale;
    }
});

document.getElementById('pdf-container').addEventListener('touchmove', e => {
    if (e.touches.length === 2 && initialDistance) {
        e.preventDefault(); 
        const currentDistance = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );
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
        setTimeout(() => { isPinching = false; }, 300); // Debounce pinch
    }
});

function handleSwipe() {
    const swipeThreshold = 60;
    if (touchEndX < touchStartX - swipeThreshold) { 
        if (pageNum < pdfDoc.numPages) { pageNum++; queueRenderPage(pageNum); }
    }
    if (touchEndX > touchStartX + swipeThreshold) { 
        if (pageNum > 1) { pageNum--; queueRenderPage(pageNum); }
    }
}

// --- Thumbnail Engine ---
let thumbnailsGenerated = false;

const generateThumbnails = async () => {
    const grid = document.getElementById('thumbnail-grid');
    grid.innerHTML = '<span style="color: white; padding: 20px;">جاري تحميل الصفحات...</span>';
    
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        if(i === 1) grid.innerHTML = ''; // clear loading text
        
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 }); // Small scale for thumbnails
        
        const thumbCanvas = document.createElement('canvas');
        const thumbCtx = thumbCanvas.getContext('2d');
        thumbCanvas.height = viewport.height;
        thumbCanvas.width = viewport.width;
        
        await page.render({ canvasContext: thumbCtx, viewport: viewport }).promise;

        const thumbItem = document.createElement('div');
        thumbItem.className = 'thumbnail-item';
        thumbItem.innerHTML = `<span>صفحة ${i}</span>`;
        thumbItem.insertBefore(thumbCanvas, thumbItem.firstChild);
        
        thumbItem.onclick = () => {
            pageNum = i;
            queueRenderPage(pageNum);
            document.getElementById('thumbnail-modal').classList.add('hidden');
            // Hide bars when returning to document
            document.querySelector('.toolbar').classList.add('hidden');
            document.querySelector('.bottom-bar').classList.add('hidden');
        };
        
        grid.appendChild(thumbItem);
    }
    thumbnailsGenerated = true;
};

document.getElementById('page-jump-btn').addEventListener('click', (e) => {
    e.stopPropagation(); // Prevents the container tap event from firing
    document.getElementById('thumbnail-modal').classList.remove('hidden');
    if (!thumbnailsGenerated) generateThumbnails();
});

document.getElementById('close-thumbnails').addEventListener('click', () => {
    document.getElementById('thumbnail-modal').classList.add('hidden');
});

// --- Init Document ---
pdfjsLib.getDocument({ url: url }).promise.then(pdfDoc_ => {
    pdfDoc = pdfDoc_;
    document.getElementById('page-count').textContent = pdfDoc.numPages;
    renderPage(pageNum);
}).catch(err => {
    console.error("Error loading PDF: ", err);
    alert("حدث خطأ أثناء تحميل الملف.");
});

// Security
document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function(e) {
    if(e.keyCode == 123 || (e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) || (e.ctrlKey && e.shiftKey && e.keyCode == 'C'.charCodeAt(0)) || (e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) || (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) || (e.ctrlKey && e.keyCode == 'P'.charCodeAt(0))) { return false; }
};
