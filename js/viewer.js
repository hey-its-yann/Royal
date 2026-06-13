// 1. Telegram Integration & Watermark
const tg = window.Telegram.WebApp;
tg.expand();

const user = tg.initDataUnsafe?.user || { id: '000000', first_name: 'Student' };
const watermarkContainer = document.getElementById('watermark-overlay');

function generateWatermark() {
    // English Watermark per request
    const watermarkString = `Royal Library | ${user.first_name} | ID: ${user.id}   `;
    let html = '';
    for (let i = 0; i < 70; i++) {
        html += `<div class="watermark-text">${watermarkString}</div>`;
    }
    watermarkContainer.innerHTML = html;
}
generateWatermark();

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

let pdfDoc = null,
    pageNum = 1,
    pageIsRendering = false,
    pageNumIsPending = null,
    scale = 1.0, 
    canvas = document.getElementById('pdf-render'),
    ctx = canvas.getContext('2d');

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

// 5. Auto-Hide Toolbars
let hideTimeout;
const toggleBars = () => {
    document.querySelector('.toolbar').classList.remove('hidden');
    document.querySelector('.bottom-bar').classList.remove('hidden');
    clearTimeout(hideTimeout);
    
    // Hide after 3 seconds
    hideTimeout = setTimeout(() => {
        document.querySelector('.toolbar').classList.add('hidden');
        document.querySelector('.bottom-bar').classList.add('hidden');
    }, 3000);
};

// Trigger hide behavior on interaction
document.getElementById('pdf-container').addEventListener('click', toggleBars);
document.getElementById('pdf-container').addEventListener('touchstart', toggleBars);
toggleBars(); // Initialize on load

// 6. Navigation Controls (Inverted Functions per request)
// Prev button now goes FORWARD
document.getElementById('prev-page').addEventListener('click', () => {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
    toggleBars();
});

// Next button now goes BACKWARD
document.getElementById('next-page').addEventListener('click', () => {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
    toggleBars();
});

// Jump to specific page
document.getElementById('page-jump-btn').addEventListener('click', () => {
    const jump = parseInt(prompt(`أدخل رقم الصفحة (1 - ${pdfDoc.numPages}):`, pageNum));
    if (jump >= 1 && jump <= pdfDoc.numPages) {
        pageNum = jump;
        queueRenderPage(pageNum);
    }
    toggleBars();
});

// 7. Touch Gestures (Swipe to Turn, Pinch to Zoom)
let touchStartX = 0;
let touchEndX = 0;
let initialDistance = null;
let initialScale = scale;

document.getElementById('pdf-container').addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
        touchStartX = e.changedTouches[0].screenX;
    } else if (e.touches.length === 2) {
        // Start Pinch
        initialDistance = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );
        initialScale = scale;
    }
});

document.getElementById('pdf-container').addEventListener('touchmove', e => {
    if (e.touches.length === 2 && initialDistance) {
        e.preventDefault(); // Stop standard scrolling while zooming
        const currentDistance = Math.hypot(
            e.touches[0].pageX - e.touches[1].pageX,
            e.touches[0].pageY - e.touches[1].pageY
        );
        const zoomFactor = currentDistance / initialDistance;
        scale = Math.min(Math.max(0.5, initialScale * zoomFactor), 3.0); // Limit min/max zoom
        
        // Dynamically update visual width without full re-render for smooth feeling
        canvas.style.width = `${(canvas.width / 2.0) * scale}px`;
    }
});

document.getElementById('pdf-container').addEventListener('touchend', e => {
    if (e.changedTouches.length === 1 && !initialDistance) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }
    if (e.touches.length < 2) {
        initialDistance = null; 
        // Update the select dropdown to 'custom' or closest value after pinch
        document.getElementById('zoom-select').value = "1.0"; // Reset select visual logic if needed
    }
});

function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) { 
        // Swiped Left - Go Forward
        if (pageNum < pdfDoc.numPages) { pageNum++; queueRenderPage(pageNum); }
    }
    if (touchEndX > touchStartX + swipeThreshold) { 
        // Swiped Right - Go Backward
        if (pageNum > 1) { pageNum--; queueRenderPage(pageNum); }
    }
}

// 8. Fixed Zoom Dropdown Logic
document.getElementById('zoom-select').addEventListener('change', (e) => {
    scale = parseFloat(e.target.value);
    queueRenderPage(pageNum);
    toggleBars();
});

// 9. Load Document
pdfjsLib.getDocument({ url: url }).promise.then(pdfDoc_ => {
    pdfDoc = pdfDoc_;
    document.getElementById('page-count').textContent = pdfDoc.numPages;
    renderPage(pageNum);
}).catch(err => {
    console.error("Error loading PDF: ", err);
    alert("حدث خطأ أثناء تحميل الملف.");
});

// 10. Security Measures
document.addEventListener('contextmenu', event => event.preventDefault());

document.onkeydown = function(e) {
    if(e.keyCode == 123 || 
      (e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) || 
      (e.ctrlKey && e.shiftKey && e.keyCode == 'C'.charCodeAt(0)) || 
      (e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) || 
      (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) || 
      (e.ctrlKey && e.keyCode == 'P'.charCodeAt(0))) { 
        return false;
    }
};
