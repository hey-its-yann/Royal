// 1. Telegram & Watermark
const tg = window.Telegram.WebApp;
tg.expand();

const user = tg.initDataUnsafe?.user || { id: '000000', first_name: 'طالب' };
const watermarkContainer = document.getElementById('watermark-overlay');

function generateWatermark() {
    const watermarkString = `مكتبة رويال | ${user.first_name} | ID: ${user.id}   `;
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
    window.location.href = "index.html"; 
}
const url = `assets/${requestedFile}`; 

// 3. PDF.js Config
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let pdfDoc = null, pageNum = 1, pageIsRendering = false, pageNumIsPending = null, scale = 1.0, 
    canvas = document.getElementById('pdf-render'), ctx = canvas.getContext('2d');

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

        document.getElementById('page-num').textContent = num;
    });
};

const queueRenderPage = num => {
    if (pageIsRendering) pageNumIsPending = num;
    else renderPage(num);
};

// 5. Controls
document.getElementById('prev-page').addEventListener('click', () => {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
});

document.getElementById('next-page').addEventListener('click', () => {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
});

document.getElementById('zoom-in').addEventListener('click', () => {
    scale += 0.2;
    document.getElementById('zoom-level').textContent = `${Math.round(scale * 100)}%`;
    queueRenderPage(pageNum);
});

document.getElementById('zoom-out').addEventListener('click', () => {
    if (scale <= 0.6) return;
    scale -= 0.2;
    document.getElementById('zoom-level').textContent = `${Math.round(scale * 100)}%`;
    queueRenderPage(pageNum);
});

// Fullscreen Logic
document.getElementById('fullscreen-btn').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log("Error attempting to enable fullscreen:", err.message);
        });
    } else {
        document.exitFullscreen();
    }
});

// 6. Load Document
pdfjsLib.getDocument({ url: url }).promise.then(pdfDoc_ => {
    pdfDoc = pdfDoc_;
    document.getElementById('page-count').textContent = pdfDoc.numPages;
    renderPage(pageNum);
}).catch(err => {
    console.error("Error loading PDF: ", err);
    // Explicit error if file doesn't exist
    if (err.name === 'MissingPDFException') {
        alert("الملف غير موجود. يرجى التأكد من رفع ملف الـ PDF إلى المسار الصحيح على GitHub.");
    } else {
        alert("حدث خطأ أثناء تحميل الملف.");
    }
});

// 7. Security Measures (Anti-Dev)
document.addEventListener('contextmenu', event => event.preventDefault());
document.onkeydown = function(e) {
    if(e.keyCode == 123 || (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 67 || e.keyCode == 74)) || (e.ctrlKey && (e.keyCode == 85 || e.keyCode == 80))) {
        return false;
    }
};
