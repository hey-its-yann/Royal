// 1. Telegram Integration & Watermark
const tg = window.Telegram.WebApp;
tg.expand(); // Expand to full screen

// Get user data, provide fallback if tested outside Telegram
const user = tg.initDataUnsafe?.user || { id: '000000', first_name: 'ÿ«·»' };
const watermarkContainer = document.getElementById('watermark-overlay');

function generateWatermark() {
    const watermarkString = `„ﬂ »… —ÊÌ«· | ${user.first_name} | ID: ${user.id}   `;
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
    alert("·„ Ì „  ÕœÌœ „·›! Ã«—Ì «·⁄Êœ… ··—∆Ì”Ì…...");
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
        const renderScale = 2.0; // High resolution rendering
        const viewport = page.getViewport({ scale: renderScale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Visual CSS scaling
        canvas.style.width = `${(viewport.width / renderScale) * scale}px`;

        const renderCtx = {
            canvasContext: ctx,
            viewport: viewport
        };

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

// 6. Load Document (Add 'password: "your_password"' here if your PDFs are encrypted)
pdfjsLib.getDocument({ url: url }).promise.then(pdfDoc_ => {
    pdfDoc = pdfDoc_;
    document.getElementById('page-count').textContent = pdfDoc.numPages;
    renderPage(pageNum);
}).catch(err => {
    console.error("Error loading PDF: ", err);
    alert("ÕœÀ Œÿ√ √À‰«¡  Õ„Ì· «·„·›. Ì—ÃÏ «· √ﬂœ „‰ «·—«»ÿ √Ê  ‘€Ì· «·„Êﬁ⁄ ⁄»— ”Ì—›— „Õ·Ì.");
});

// 7. Security Measures
// Disable right-click
document.addEventListener('contextmenu', event => event.preventDefault());

// Disable Dev Tools and Print Shortcuts
document.onkeydown = function(e) {
    if(e.keyCode == 123 || // F12
      (e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) || // Ctrl+Shift+I
      (e.ctrlKey && e.shiftKey && e.keyCode == 'C'.charCodeAt(0)) || // Ctrl+Shift+C
      (e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) || // Ctrl+Shift+J
      (e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) || // Ctrl+U
      (e.ctrlKey && e.keyCode == 'P'.charCodeAt(0))) { // Ctrl+P
        return false;
    }
};