//  TraceView displays trace information
//
//  Data must be of this structure:
//  {
//  "pos": [1, 2, ...],            # Ignored
//  "peakA": [0, 0, 0, ...],       # Essential
//  "peakC": [4138, 3984, ...],    # Essential
//  "peakG": [0, 0, 0, 0, ...],    # Essential
//  "peakT": [1265, 1134, ...],    # Essential
//  "basecallPos": [12, 34,  ...], # Essential
//  "basecalls": {"12":"1:C", "34":"2:C", "41":"3:C",    # Essential
//  "refchr": "example",           # Optional
//  "refpos": 32,                  # Optional
//  "refalign": "CCCGGCAT...",     # Optional
//  "forward": 1                   # Optional
//  }
//

module.exports = {
    displayData: displayData,
    deleteContent: deleteContent
};

// Global Values
var winXst;
var winXend;
var winYend;
var frameXst;
var frameXend;
var frameYst;
var frameYend;
var allResults;
var baseCol;
var traceSeqString = "";

// Drag state
var isDragging = false;
var dragStartX = 0;
var dragWinXst = 0;
var dragWinXend = 0;

function resetGlobalValues() {
    winXst = 0;
    winXend = 600;
    winYend = 2300;
    frameXst = 0;
    frameXend = 1000;
    frameYst = 0;
    frameYend = 200;
    baseCol = [["green",1.5],["blue",1.5],["black",1.5],["red",1.5]];
    allResults = "";
    traceSeqString = "";
}

function createButtons() {
    var html = '<div id="traceView-Buttons" class="d-none">';
    html += '  <button id="traceView-nav-bw-win" class="btn btn-outline-secondary">prev</button>';
    html += '  <button id="traceView-nav-bw-bit" class="btn btn-outline-secondary">&lt;</button>';
    html += '  <button id="traceView-nav-zy-in" class="btn btn-outline-secondary">Bigger Peaks</button>';
    html += '  <button id="traceView-nav-zy-out" class="btn btn-outline-secondary">Smaller Peaks</button>';
    html += '  <button id="traceView-nav-zx-in" class="btn btn-outline-secondary">Zoom in</button>';
    html += '  <button id="traceView-nav-zx-out" class="btn btn-outline-secondary">Zoom Out</button>';
    html += '  <button id="traceView-nav-fw-bit" class="btn btn-outline-secondary">&gt;</button>';
    html += '  <button id="traceView-nav-fw-win" class="btn btn-outline-secondary">next</button>';
    html += '  <a>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</a>';
    html += '  <button id="traceView-nav-hi-a" class="btn btn-outline-secondary"><strong>A</strong></button>';
    html += '  <button id="traceView-nav-hi-c" class="btn btn-outline-secondary"><strong>C</strong></button>';
    html += '  <button id="traceView-nav-hi-g" class="btn btn-outline-secondary"><strong>G</strong></button>';
    html += '  <button id="traceView-nav-hi-t" class="btn btn-outline-secondary"><strong>T</strong></button>';
    html += '  <button id="traceView-nav-hi-n" class="btn btn-outline-secondary">ACGT</button>';
    html += '</div>';
    html += '<div id="traceView-Traces"></div>';
    html += '<div id="traceView-Sequence" class="d-none">';
    html += '  <hr>\n  <p>Chromatogram Sequence:</p>';
    html += '  <div id="traceView-traceSeqView" class="form-control" style="white-space: pre-wrap; font-family: monospace; min-height: 7em; cursor: text;"></div>';
    html += '  <textarea id="traceView-traceSeq" class="d-none" readonly></textarea>';
    html += '</div>';
    html += '<div id="traceView-Reference" class="d-none">';
    html += '  <hr>\n  <p>Reference Sequence:</p>';
    html += '  <textarea class="form-control" id="traceView-refSeq" rows="7" cols="110"></textarea>';
    html += '</div>';
    return html;
}

function showElement(element) {
  element.classList.remove('d-none');
}

function hideElement(element) {
  element.classList.add('d-none');
}

document.addEventListener("DOMContentLoaded", function() {
    resetGlobalValues();
    var trv = document.getElementById('traceView');
    trv.innerHTML = createButtons();

    var navBwWinButton = document.getElementById('traceView-nav-bw-win')
    navBwWinButton.addEventListener('click', navBwWin)
    var navBwBitButton = document.getElementById('traceView-nav-bw-bit')
    navBwBitButton.addEventListener('click', navBwBit)
    var navZoomYinButton = document.getElementById('traceView-nav-zy-in')
    navZoomYinButton.addEventListener('click', navZoomYin)
    var navZoomYoutButton = document.getElementById('traceView-nav-zy-out')
    navZoomYoutButton.addEventListener('click', navZoomYout)
    var navZoomXinButton = document.getElementById('traceView-nav-zx-in')
    navZoomXinButton.addEventListener('click', navZoomXin)
    var navZoomXoutButton = document.getElementById('traceView-nav-zx-out')
    navZoomXoutButton.addEventListener('click', navZoomXout)
    var navFwBitButton = document.getElementById('traceView-nav-fw-bit')
    navFwBitButton.addEventListener('click', navFwBit)
    var navFwWinButton = document.getElementById('traceView-nav-fw-win')
    navFwWinButton.addEventListener('click', navFwWin)
    var navHiAButton = document.getElementById('traceView-nav-hi-a')
    navHiAButton.addEventListener('click', navHiA)
    var navHiCButton = document.getElementById('traceView-nav-hi-c')
    navHiCButton.addEventListener('click', navHiC)
    var navHiGButton = document.getElementById('traceView-nav-hi-g')
    navHiGButton.addEventListener('click', navHiG)
    var navHiTButton = document.getElementById('traceView-nav-hi-t')
    navHiTButton.addEventListener('click', navHiT)
    var navHiNButton = document.getElementById('traceView-nav-hi-n')
    navHiNButton.addEventListener('click', navHiN)

    // Mouse handlers
    attachDragHandlers();
    attachWheelZoom();
});

// Integer window start and end
function getIntWindow(startX, endX, maxLen) {
    var s = Math.max(0, Math.floor(startX));
    var e = Math.min(maxLen, Math.ceil(endX));
    if (e <= s) e = s + 1;
    return { s: s, e: e };
}

// Set window bounds
function checkWindow(maxX) {
    if (!isFinite(winXst) || !isFinite(winXend)) {
        winXst = 0; winXend = 1;
    }
    if (winXend <= winXst) {
        winXend = winXst + 1;
    }
    if (winXst < 0) {
        var d = -winXst; winXst = 0; winXend += d;
    }
    if (maxX >= 0 && winXend > maxX) {
        var over = winXend - maxX;
        winXst = Math.max(0, winXst - over);
        winXend = maxX;
    }
    if (winXend - winXst < 1) winXend = winXst + 1;
}

function navFaintCol() {
    baseCol = [["#a6d3a6",1.5],["#a6a6ff",1.5],["#a6a6a6",1.5],["#ffa6a6",1.5]];
}

function navHiN() {
    baseCol = [["green",1.5],["blue",1.5],["black",1.5],["red",1.5]];
    SVGRepaint();
}

function navHiA() {
    navFaintCol();
    baseCol[0] = ["green",2.5];
    SVGRepaint();    
}

function navHiC() {
    navFaintCol();
    baseCol[1] = ["blue",2.5];
    SVGRepaint();
}

function navHiG() {
    navFaintCol();
    baseCol[2] = ["black",2.5];
    SVGRepaint();
}

function navHiT() {
    navFaintCol();
    baseCol[3] = ["red",2.5];
    SVGRepaint();
}

function navBwBit() {
    var oldStep = winXend - winXst;
    var step = Math.floor(oldStep/3);
    winXst -= step;
    winXend -= step;
    if (winXst < 0) {
        winXst = 0;
        winXend = oldStep;
    }
    SVGRepaint();
}

function navBwWin() {
    var step = winXend - winXst;
    winXst -= step;
    winXend -= step;
    if (winXst < 0) {
        winXst = 0;
        winXend = step;
    }
    SVGRepaint();
}

function navZoomYin() {
    winYend = winYend * 3 / 4;
    SVGRepaint();
}

function navZoomYout() {
    winYend = winYend * 4 / 3;
    SVGRepaint();
}

function navZoomXin() {
    var oldStep = winXend - winXst;
    var center = winXst + oldStep / 2;
    var step = Math.floor(oldStep * 3 / 4);
    winXst = Math.floor(center - step / 2);
    winXend = Math.floor(center + step / 2);
    SVGRepaint();
}

function navZoomXout() {
    var oldStep = winXend - winXst;
    var center = winXst + oldStep / 2;
    var step = Math.floor(oldStep * 4 / 3);
    winXst = Math.floor(center - step / 2);
    winXend = Math.floor(center + step / 2);
    if (winXst < 0) {
        winXst = 0;
        winXend = step;
    }
    SVGRepaint();
}

function navFwBit() {
    var step = Math.floor((winXend - winXst)/3);
    winXst += step;
    winXend += step;
    SVGRepaint();
}

function navFwWin() {
    var step = winXend - winXst;
    winXst += step;
    winXend += step;
    SVGRepaint();
}

function SVGRepaint(){
    if (!allResults || !allResults.peakA) return;
    checkWindow(allResults.peakA.length - 1);
    var retVal = createSVG(allResults,winXst,winXend,winYend,frameXst,frameXend,frameYst,frameYend);
    digShowSVG(retVal);
    updateHighlight(allResults);
}

function displayTextSeq (tr) {
    var seq = "";
    for (var i = 0; i < tr.basecallPos.length; i++) {
        var base = tr.basecalls[tr.basecallPos[i]] + " ";
        var pos = base.indexOf(":");
        seq += base.charAt(pos + 1);
    }
    traceSeqString = seq.replace(/-/g,"");
    var hidden = document.getElementById('traceView-traceSeq');
    hidden.value = traceSeqString;
    var trSeq = document.getElementById('traceView-Sequence');
    showElement(trSeq);

    if (tr.hasOwnProperty('refalign')){
        var ref = tr.refalign;
        var outField2 = document.getElementById('traceView-refSeq')
        outField2.value = ref.replace(/-/g,"");
        var refSeq = document.getElementById('traceView-Reference');
        showElement(refSeq);
    }
    renderSeqView(tr);
}

// Faster: inline SVG instead of data URL image
function digShowSVG(svg) {
    var sectionResults = document.getElementById('traceView-Traces');
    if (sectionResults.firstElementChild && sectionResults.firstElementChild.tagName.toLowerCase() === 'svg') {
        sectionResults.firstElementChild.outerHTML = svg;
    } else {
        sectionResults.innerHTML = svg;
    }
}

function createSVG(tr,startX,endX,endY,wdXst,wdXend,wdYst,wdYend) {
    var retVal = createAllCalls(tr,startX,endX,endY,wdXst,wdXend,wdYst,wdYend);
    retVal += createCoodinates (tr,startX,endX,endY,wdXst,wdXend,wdYst,wdYend);
    retVal += "</svg>";
    var head;
    if (tr.hasOwnProperty('refalign')) {
        head = "<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='360' viewBox='-60 -40 1200 360'>";
    } else {
        head = "<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='300' viewBox='-60 -40 1200 300'>";
    }
    return head + retVal;
}

function createCoodinates (tr,startX,endX,endY,wdXst,wdXend,wdYst,wdYend){
    var w = getIntWindow(startX, endX, tr.peakA.length);
    startX = w.s; endX = w.e;

    var lineXst = wdXst - 5;
    var lineXend = wdXend + 5;
    var lineYst = wdYst - 5;
    var lineYend = wdYend + 5;
    var retVal = "<line x1='" + lineXst + "' y1='" + lineYend;
    retVal += "' x2='" + lineXend + "' y2='" + lineYend + "' stroke-width='2' stroke='black' stroke-linecap='square'/>";
    retVal += "<line x1='" + lineXst + "' y1='" + lineYst;
    retVal += "' x2='" + lineXst + "' y2='" + lineYend + "' stroke-width='2' stroke='black' stroke-linecap='square'/>";

    var prim = "";
    var sec = "";
    for (var i = 0; i < tr.basecallPos.length; i++) {
        var base = tr.basecalls[tr.basecallPos[i]] + " ";
        var pos = base.indexOf(":");
        prim += base.charAt(pos + 1);
        if (pos + 3 < base.length) {
            sec += base.charAt(pos + 3);
        } else {
            sec += base.charAt(pos + 1);
        }
    }

    // The X-Axis
    var firstBase = -1;
    var lastBase = -1;
    for (var i = 0; i < tr.basecallPos.length; i++) {
        var posVal = parseFloat(tr.basecallPos[i]);
        if ((posVal > startX) && (posVal < endX)) {
            if (firstBase === -1) {
                firstBase = tr.basecalls[tr.basecallPos[i]];
            }
            lastBase = tr.basecalls[tr.basecallPos[i]];
            var xPos = wdXst + (posVal - startX) / (endX - startX)  * (wdXend - wdXst);
            retVal += "<line x1='" + xPos + "' y1='" + lineYend;
            retVal += "' x2='" + xPos + "' y2='" + (lineYend + 7)+ "' stroke-width='2' stroke='black' />";
            retVal += "<text x='" + (xPos + 3) + "' y='" + (lineYend + 11);
            retVal += "' font-family='Arial' font-size='10' fill='black' text-anchor='end' transform='rotate(-90 ";
            retVal += (xPos + 3) + "," + (lineYend + 11) + ")'>";
            retVal += tr.basecalls[tr.basecallPos[i]] + "</text>";

            if(tr.hasOwnProperty('refalign')){
                if (!(tr.refalign.charAt(i) === prim.charAt(i) && tr.refalign.charAt(i) === sec.charAt(i))) {
                    var refcol = "red";
                    if (tr.refalign.charAt(i) === prim.charAt(i) || tr.refalign.charAt(i) === sec.charAt(i)) {
                        refcol = "orange";
                    }
                    retVal += "<rect x='" + (xPos - 5) + "' y='" + (lineYend + 63);
                    retVal += "' width='10' height='10' style='fill:" + refcol + ";stroke-width:3;stroke:" + refcol + "' />";
                }
                retVal += "<text x='" + (xPos + 3) + "' y='" + (lineYend + 71);
                retVal += "' font-family='Arial' font-size='10' fill='black' text-anchor='end'>";
                retVal += tr.refalign.charAt(i);
                retVal +=  "</text>";
            }
        }
    }

    var refOrient = "";
    if(tr.hasOwnProperty('forward')){
        if(tr.forward == 1) {
            if(tr.hasOwnProperty('refpos')){
                firstBase = parseInt(tr.refpos) + parseInt(firstBase);
                lastBase = parseInt(tr.refpos) + parseInt(lastBase);
                retVal += "<text x='-5' y='" + (lineYend + 71);
                retVal += "' font-family='Arial' font-size='10' fill='black' text-anchor='end'>";
                retVal += firstBase + "</text>";
                retVal += "<text x='1005' y='" + (lineYend + 71);
                retVal += "' font-family='Arial' font-size='10' fill='black' text-anchor='start'>";
                retVal += lastBase + "</text>";
            }
            refOrient = " - forward";
        } else {
            if(tr.hasOwnProperty('refpos')){
                firstBase = parseInt(tr.refpos) - parseInt(firstBase);
                lastBase = parseInt(tr.refpos) - parseInt(lastBase);
                retVal += "<text x='-5' y='" + (lineYend + 71);
                retVal += "' font-family='Arial' font-size='10' fill='black' text-anchor='end'>";
                retVal += firstBase + "</text>";
                retVal += "<text x='1005' y='" + (lineYend + 71);
                retVal += "' font-family='Arial' font-size='10' fill='black' text-anchor='start'>";
                retVal += lastBase + "</text>";
            }
            refOrient = " - reverse";
        }
    }
    if(tr.hasOwnProperty('refchr')){
        retVal += "<text x='500' y='" + (lineYend + 100);
        retVal += "' font-family='Arial' font-size='15' fill='black' text-anchor='middle'>";
        retVal += tr.refchr + refOrient + "</text>";
    }
   
    // The Y-Axis
    var yPow = Math.pow(10, Math.floor(Math.log10(endY/10)));
    var yStep = Math.floor(endY/10/yPow) * yPow;
    for (var i = 0; i * yStep < endY; i++) {
        var yPos = wdYend - i * yStep / endY * (wdYend - wdYst);
        retVal += "<line x1='" + lineXst + "' y1='" + yPos;
        retVal += "' x2='" + (lineXst - 7) + "' y2='" + yPos + "' stroke-width='2' stroke='black' />";
        retVal += "<text x='" + (lineXst - 11) + "' y='" + (yPos + 3);
        retVal += "' font-family='Arial' font-size='10' fill='black' text-anchor='end'>";
        retVal += (i * yStep) + "</text>";
    }
   
    var sqrY = -20;
    var txtY = -9;
    retVal += "<rect x='400' y='" + sqrY + "' width='10' height='10' style='fill:green;stroke-width:3;stroke:green' />";
    retVal += "<text x='417' y='" + txtY + "' font-family='Arial' font-size='18' fill='black'>A</text>";
    retVal += "<rect x='450' y='" + sqrY + "' width='10' height='10' style='fill:blue;stroke-width:3;stroke:blue' />";
    retVal += "<text x='467' y='" + txtY + "' font-family='Arial' font-size='18' fill='black'>C</text>";
    retVal += "<rect x='500' y='" + sqrY + "' width='10' height='10' style='fill:black;stroke-width:3;stroke:black' />";
    retVal += "<text x='517' y='" + txtY + "' font-family='Arial' font-size='18' fill='black'>G</text>";
    retVal += "<rect x='550' y='" + sqrY + "' width='10' height='10' style='fill:red;stroke-width:3;stroke:red' />";
    retVal += "<text x='567' y='" + txtY + "' font-family='Arial' font-size='18' fill='black'>T</text>";

    return retVal;
}

function createAllCalls(tr,startX,endX,endY,wdXst,wdXend,wdYst,wdYend){
    var w = getIntWindow(startX, endX, tr.peakA.length);
    var retVal = createOneCalls(tr.peakA,baseCol[0],w.s,w.e,endY,wdXst,wdXend,wdYst,wdYend);
    retVal += createOneCalls(tr.peakC,baseCol[1],w.s,w.e,endY,wdXst,wdXend,wdYst,wdYend);
    retVal += createOneCalls(tr.peakG,baseCol[2],w.s,w.e,endY,wdXst,wdXend,wdYst,wdYend);
    retVal += createOneCalls(tr.peakT,baseCol[3],w.s,w.e,endY,wdXst,wdXend,wdYst,wdYend);
    return retVal;
}

function createOneCalls(trace,col,startX,endX,endY,wdXst,wdXend,wdYst,wdYend){
    if (endX <= startX) return "";
    var startTag = "<polyline fill='none' stroke-linejoin='round' stroke='" + col[0];
    startTag += "' stroke-width='" + col[1] + "' points='";
    var retVal = "";
    var lastVal = -99;
    for (var i = startX; i < endX; i++) {
        if(!(typeof trace[i] === 'undefined')){
            var iden = parseFloat(trace[i]);
            if ((lastVal < -90) && (iden > -90)) {
                retVal += startTag;
            }
            if ((lastVal > -90) && (iden < -90)) {
                retVal += "'/>";
            }
            lastVal = iden;
            iden = parseFloat(trace[i]) / endY;
            if (iden > 1.0) {
                iden = 1;
            }
            var span = (endX - startX);
            if (span === 0) continue;
            var xPos = wdXst + (i - startX) / span * (wdXend - wdXst);
            var yPos = wdYend - iden * (wdYend - wdYst);
            retVal += xPos + "," + yPos + " ";
        } 
    }
    if (lastVal > -90) {
        retVal += "'/>";
    }
    return retVal;
}

function errorMessage(err) {
    deleteContent();
    var html = '<div id="traceView-error" class="alert alert-danger" role="alert">';
    html += '  <i class="fas fa-fire"></i>';
    html += '  <span id="error-message">' + err;
    html += '  </span>';
    html += '</div>';
    var trTrc = document.getElementById('traceView-Traces');
    trTrc.innerHTML = html;
}

function displayData(res) {
    resetGlobalValues();
    allResults = res;
    if (allResults.hasOwnProperty('peakA') == false){
        errorMessage("Bad JSON data: peakA array missing!");
        return;
    }
    if (allResults.hasOwnProperty('peakC') == false){
        errorMessage("Bad JSON data: peakC array missing!");
        return;
    }
    if (allResults.hasOwnProperty('peakG') == false){
        errorMessage("Bad JSON data: peakG array missing!");
        return;
    }
    if (allResults.hasOwnProperty('peakT') == false){
        errorMessage("Bad JSON data: peakT array missing!");
        return;
    }
    if (allResults.hasOwnProperty('basecallPos') == false){
        errorMessage("Bad JSON data: basecallPos array missing!");
        return;
    }
    if (allResults.hasOwnProperty('basecalls') == false){
        errorMessage("Bad JSON data: basecalls object missing!");
        return;
    }
    displayTextSeq(allResults);
    attachSeqSelectionHandler(allResults);
    SVGRepaint();
    var trBtn = document.getElementById('traceView-Buttons');
    showElement(trBtn);
}

function deleteContent() {
    var trBtn = document.getElementById('traceView-Buttons');
    hideElement(trBtn);
    var trTrc = document.getElementById('traceView-Traces');
    trTrc.innerHTML = "";
    var trSeq = document.getElementById('traceView-Sequence');
    hideElement(trSeq);
    var outField = document.getElementById('traceView-traceSeq')
    outField.value = "";
    var refSeq = document.getElementById('traceView-Reference');
    hideElement(refSeq);
    var outField2 = document.getElementById('traceView-refSeq')
    outField2.value = "";
}

// Drag handlers (direction inverted: drag right -> earlier bases)
function attachDragHandlers() {
    var traces = document.getElementById('traceView-Traces');
    if (!traces) return;

    traces.style.cursor = 'grab';

    traces.addEventListener('mousedown', function (e) {
        isDragging = true;
        dragStartX = e.clientX;
        dragWinXst = winXst;
        dragWinXend = winXend;
        traces.style.cursor = 'grabbing';
        e.preventDefault(); // avoid text selection
    });

    let rafPending = false;
    function repaint() {
        rafPending = false;
        SVGRepaint();
    }

    window.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        if (!allResults || !allResults.peakA) return;

        var rect = traces.getBoundingClientRect();
        var widthPx = rect.width || (frameXend - frameXst);
        if (!widthPx || widthPx <= 0) return;

        var basesPerPx = (dragWinXend - dragWinXst) / widthPx;
        if (!isFinite(basesPerPx) || basesPerPx === 0) return;

        var dxPx = e.clientX - dragStartX;
        var deltaBases = dxPx * basesPerPx;

        // Inverted direction: drag right -> earlier bases
        var newSt = dragWinXst - deltaBases;
        var newEnd = dragWinXend - deltaBases;

        var maxX = allResults.peakA.length - 1;
        if (newSt < 0) { newEnd -= newSt; newSt = 0; }
        if (newEnd > maxX) {
            var over = newEnd - maxX;
            newSt = Math.max(0, newSt - over);
            newEnd = maxX;
        }
        if (newEnd - newSt < 10) newEnd = newSt + 10;

        winXst = newSt;
        winXend = newEnd;
        checkWindow(maxX);

        if (!rafPending) {
            rafPending = true;
            requestAnimationFrame(repaint);
        }
    });

    function stopDrag() {
        isDragging = false;
        traces.style.cursor = 'grab';
    }
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('mouseleave', stopDrag);
}

// Mouse wheel zoom (over the trace view)
function attachWheelZoom() {
    var traces = document.getElementById('traceView-Traces');
    if (!traces) return;

    traces.addEventListener('wheel', function(e) {
        if (!allResults || !allResults.peakA) return;

        e.preventDefault(); // stop page scroll

        var rect = traces.getBoundingClientRect();
        var widthPx = rect.width || (frameXend - frameXst);
        if (!widthPx || widthPx <= 0) return;

        var span = winXend - winXst;
        if (span <= 0) return;

        // Mouse position in bases
        var relPx = e.clientX - rect.left;
        var relRatio = Math.min(1, Math.max(0, relPx / widthPx));
        var centerBase = winXst + relRatio * span;

        // Zoom factor
        var factor = (e.deltaY < 0) ? 0.8 : 1.25; // up = zoom in, down = zoom out
        var newSpan = span * factor;
        if (newSpan < 10) newSpan = 10;

        var newSt = centerBase - relRatio * newSpan;
        var newEnd = newSt + newSpan;

        var maxX = allResults.peakA.length - 1;
        if (newSt < 0) { newEnd -= newSt; newSt = 0; }
        if (newEnd > maxX) {
            var over = newEnd - maxX;
            newSt = Math.max(0, newSt - over);
            newEnd = maxX;
        }
        if (newEnd - newSt < 10) newEnd = newSt + 10;

        winXst = newSt;
        winXend = newEnd;
        checkWindow(maxX);

        requestAnimationFrame(SVGRepaint);
    }, { passive: false });
}

// Select-to-center-and-zoom on chromatogram sequence (span-based)
function attachSeqSelectionHandler(tr) {
    var view = document.getElementById('traceView-traceSeqView');
    if (!view || !tr || !tr.basecallPos || !tr.basecallPos.length) return;

    function getSpanIndex(node){
        while (node && node !== view){
            if (node.dataset && node.dataset.idx) return parseInt(node.dataset.idx);
            node = node.parentNode;
        }
        return null;
    }

    const handler = () => {
        var sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        var range = sel.getRangeAt(0);
        var startIdx = getSpanIndex(range.startContainer);
        var endIdx = getSpanIndex(range.endContainer);
        if (startIdx === null || endIdx === null) return;
        if (range.endOffset === 0) endIdx = endIdx - 1;
        if (startIdx > endIdx) { var t=startIdx; startIdx=endIdx; endIdx=t; }
        startIdx = Math.max(0,startIdx);
        endIdx = Math.min(tr.basecallPos.length-1, endIdx);
        if (endIdx < startIdx) return;

        var startBase = parseFloat(tr.basecallPos[startIdx]);
        var endBase   = parseFloat(tr.basecallPos[endIdx]);
        if (!isFinite(startBase) || !isFinite(endBase)) return;

        var selSpan = Math.max(1, endBase - startBase + 1);
        var spanWithMargin = Math.max(10, selSpan * 1.2);
        var centerBase = (startBase + endBase) / 2;

        winXst = centerBase - spanWithMargin / 2;
        winXend = centerBase + spanWithMargin / 2;

        checkWindow(tr.peakA.length - 1);
        SVGRepaint();
    };

    view.addEventListener('mouseup', handler);
    view.addEventListener('keyup', handler);
    view.addEventListener('select', handler);
}

// Render and highlight current view in the visible sequence div, with wrapping
function renderSeqView(tr) {
    var view = document.getElementById('traceView-traceSeqView');
    if (!view) return;
    var wrapLen = 60;
    var rect = view.getBoundingClientRect();
    var width = rect && rect.width ? rect.width : 0;
    if (width > 0) {
        var fs = parseFloat(window.getComputedStyle(view).fontSize) || 12;
        var charW = fs * 0.62;
        var calc = Math.floor(width / charW);
        if (calc > 5) wrapLen = calc;
    }

    var html = [];
    var len = Math.min(traceSeqString.length, tr.basecallPos.length);
    var maxX = tr.peakA.length - 1;

    checkWindow(maxX);
    for (var i=0;i<len;i++){
        if (i > 0 && i % wrapLen === 0) {
            html.push('<br>');
        }
        var b = traceSeqString.charAt(i);
        var posVal = parseFloat(tr.basecallPos[i]);
        var inView = (posVal >= winXst && posVal <= winXend);
        var cls = inView ? 'text-primary font-weight-bold' : '';
        html.push('<span data-idx="'+i+'" class="'+cls+'">'+escapeHtml(b)+'</span>');
    }
    view.innerHTML = html.join('');
}

// Highlight update wrapper
function updateHighlight(tr){
    renderSeqView(tr);
}

// Escape helper
function escapeHtml(s){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
