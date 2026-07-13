//  TraceView displays trace information aligned to a reference.
//
//  Expected data structure:
//  {
//    "gappedTrace": {
//      "traceFileName": "trace",
//      "leadingGaps": 2,
//      "trailingGaps": 1,
//      "peakA": [0, 0, 0, ...],       // Required
//      "peakC": [4138, 3984, ...],    // Required
//      "peakG": [0, 0, 0, 0, ...],    // Required
//      "peakT": [1265, 1134, ...],    // Required
//      "basecallPos": [12, 34, ...],  // Required
//      "basecallQual": [40, 38, ...], // Optional but recommended (Phred)
//      "basecalls": { "12": "1:C", "34": "2:C", ... } // Required
//    },
//    "refchr": "example",    // Optional
//    "refpos": 32,           // Optional (genomic start)
//    "refalign": "CCCGGC...",// Optional, gapped to match leading/trailing gaps
//    "forward": 1            // Optional (1=fwd, 0=rev)
//  }
//

export default class TraceViewElement extends HTMLElement {
    constructor() {
        super();
    }

    disconnectedCallback() {
        if (this._onMouseMove) window.removeEventListener('mousemove', this._onMouseMove);
        if (this._onMouseUp) window.removeEventListener('mouseup', this._onMouseUp);
        if (this._onMouseLeaveWin) window.removeEventListener('mouseleave', this._onMouseLeaveWin);
    }

    #el(id) {
        return this.querySelector('#' + id);
    }

    #resetGlobalValues() {
        this.winXst = 0;
        this.winXend = 600;
        this.winYend = 2300;
        this.frameXst = 0;
        this.frameXend = 1000;
        this.frameYst = 0;
        this.frameYend = 200;
        this.baseCol = [["green",1.5],["blue",1.5],["black",1.5],["red",1.5]];
        this.allResults = "";
        this.traceSeqString = "";
        this.refAlignString = "";
        this.refSeqGapless = "";
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragWinXst = 0;
        this.dragWinXend = 0;
    }

    #createButtons() {
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
        html += '<div id="traceView-tooltip" class="traceView-tooltip d-none" style="position:absolute; pointer-events:none; background:rgba(255,255,255,0.95); border:1px solid #ccc; border-radius:4px; padding:6px; font-size:12px;"></div>';
        html += '<div id="traceView-Sequence" class="d-none">';
        html += '  <hr>';
        html += '  <div id="traceView-Sequence-header"><p>Chromatogram Sequence:</p></div>';
        html += '  <div id="traceView-traceSeqView" class="form-control" style="white-space: pre-wrap; font-family: monospace; min-height: 7em; cursor: text;"></div>';
        html += '  <div class="mt-1 d-flex align-items-center">';
        html += '    <button id="traceView-copy-view" class="btn btn-sm btn-outline-secondary mr-2">Copy view range</button>';
        html += '    <button id="traceView-copy-full" class="btn btn-sm btn-outline-secondary mr-2">Copy full</button>';
        html += '  </div>';
        html += '  <textarea id="traceView-traceSeq" class="d-none" readonly></textarea>';
        html += '</div>';
        html += '<div id="traceView-Reference" class="d-none">';
        html += '  <hr>';
        html += '  <div id="traceView-Reference-header"><p>Reference Sequence:</p></div>';
        html += '  <div id="traceView-refSeqView" class="form-control" style="white-space: pre-wrap; font-family: monospace; min-height: 7em;"></div>';
        html += '  <div class="mt-1 d-flex align-items-center">';
        html += '    <button id="traceView-ref-copy-view" class="btn btn-sm btn-outline-secondary mr-2">Copy view range</button>';
        html += '    <button id="traceView-ref-copy-full" class="btn btn-sm btn-outline-secondary mr-2">Copy full</button>';
        html += '  </div>';
        html += '  <textarea class="d-none" id="traceView-refSeq" readonly></textarea>';
        html += '</div>';
        return html;
    }

    #showElement(element) {
        if (element) element.classList.remove('d-none');
    }

    #hideElement(element) {
        if (element) element.classList.add('d-none');
    }

    connectedCallback() {
        if (this._initialized) return;
        this._initialized = true;
        this.#resetGlobalValues();
        this.innerHTML = this.#createButtons();
        this.#attachButtonHandlers();
        this.#attachDragHandlers();
        this.#attachWheelZoom();
        this.#attachTooltipHandlers();
    }

    #attachButtonHandlers() {
        var self = this;
        this.#el('traceView-nav-bw-win').addEventListener('click', function () { self.#navBwWin(); });
        this.#el('traceView-nav-bw-bit').addEventListener('click', function () { self.#navBwBit(); });
        this.#el('traceView-nav-zy-in').addEventListener('click', function () { self.#navZoomYin(); });
        this.#el('traceView-nav-zy-out').addEventListener('click', function () { self.#navZoomYout(); });
        this.#el('traceView-nav-zx-in').addEventListener('click', function () { self.#navZoomXin(); });
        this.#el('traceView-nav-zx-out').addEventListener('click', function () { self.#navZoomXout(); });
        this.#el('traceView-nav-fw-bit').addEventListener('click', function () { self.#navFwBit(); });
        this.#el('traceView-nav-fw-win').addEventListener('click', function () { self.#navFwWin(); });
        this.#el('traceView-nav-hi-a').addEventListener('click', function () { self.#navHiA(); });
        this.#el('traceView-nav-hi-c').addEventListener('click', function () { self.#navHiC(); });
        this.#el('traceView-nav-hi-g').addEventListener('click', function () { self.#navHiG(); });
        this.#el('traceView-nav-hi-t').addEventListener('click', function () { self.#navHiT(); });
        this.#el('traceView-nav-hi-n').addEventListener('click', function () { self.#navHiN(); });

        this.#el('traceView-copy-view').addEventListener('click', function () { self.#copyViewRange(); });
        this.#el('traceView-copy-full').addEventListener('click', function () { self.#copyFull(); });
        this.#el('traceView-ref-copy-view').addEventListener('click', function () { self.#copyRefViewRange(); });
        this.#el('traceView-ref-copy-full').addEventListener('click', function () { self.#copyRefFull(); });
    }

    #getIntWindow(startX, endX, maxLen) {
        var s = Math.max(0, Math.floor(startX));
        var e = Math.min(maxLen, Math.ceil(endX));
        if (e <= s) e = s + 1;
        return { s: s, e: e };
    }

    // Set window bounds
    #checkWindow(maxX) {
        if (!isFinite(this.winXst) || !isFinite(this.winXend)) {
            this.winXst = 0;
            this.winXend = 1;
        }
        if (this.winXend <= this.winXst) {
            this.winXend = this.winXst + 1;
        }
        if (this.winXst < 0) {
            var d = -this.winXst;
            this.winXst = 0;
            this.winXend += d;
        }
        if (maxX >= 0 && this.winXend > maxX) {
            var over = this.winXend - maxX;
            this.winXst = Math.max(0, this.winXst - over);
            this.winXend = maxX;
        }
        if (this.winXend - this.winXst < 1) this.winXend = this.winXst + 1;
    }

    #navFaintCol() {
        this.baseCol = [["#a6d3a6", 1.5], ["#a6a6ff", 1.5], ["#a6a6a6", 1.5], ["#ffa6a6", 1.5]];
    }

    #navHiN() {
        this.baseCol = [["green", 1.5], ["blue", 1.5], ["black", 1.5], ["red", 1.5]];
        this.#SVGRepaint();
    }

    #navHiA() {
        this.#navFaintCol();
        this.baseCol[0] = ["green", 2.5];
        this.#SVGRepaint();
    }

    #navHiC() {
        this.#navFaintCol();
        this.baseCol[1] = ["blue", 2.5];
        this.#SVGRepaint();
    }

    #navHiG() {
        this.#navFaintCol();
        this.baseCol[2] = ["black", 2.5];
        this.#SVGRepaint();
    }

    #navHiT() {
        this.#navFaintCol();
        this.baseCol[3] = ["red", 2.5];
        this.#SVGRepaint();
    }

    #navBwBit() {
        var oldStep = this.winXend - this.winXst;
        var step = Math.floor(oldStep / 3);
        this.winXst -= step;
        this.winXend -= step;
        if (this.winXst < 0) {
            this.winXst = 0;
            this.winXend = oldStep;
        }
        this.#SVGRepaint();
    }

    #navBwWin() {
        var step = this.winXend - this.winXst;
        this.winXst -= step;
        this.winXend -= step;
        if (this.winXst < 0) {
            this.winXst = 0;
            this.winXend = step;
        }
        this.#SVGRepaint();
    }

    #navZoomYin() {
        this.winYend = this.winYend * 3 / 4;
        this.#SVGRepaint();
    }

    #navZoomYout() {
        this.winYend = this.winYend * 4 / 3;
        this.#SVGRepaint();
    }

    #navZoomXin() {
        var oldStep = this.winXend - this.winXst;
        var center = this.winXst + oldStep / 2;
        var step = Math.floor(oldStep * 3 / 4);
        this.winXst = Math.floor(center - step / 2);
        this.winXend = Math.floor(center + step / 2);
        this.#SVGRepaint();
    }

    #navZoomXout() {
        var oldStep = this.winXend - this.winXst;
        var center = this.winXst + oldStep / 2;
        var step = Math.floor(oldStep * 4 / 3);
        this.winXst = Math.floor(center - step / 2);
        this.winXend = Math.floor(center + step / 2);
        if (this.winXst < 0) {
            this.winXst = 0;
            this.winXend = step;
        }
        this.#SVGRepaint();
    }

    #navFwBit() {
        var step = Math.floor((this.winXend - this.winXst) / 3);
        this.winXst += step;
        this.winXend += step;
        this.#SVGRepaint();
    }

    #navFwWin() {
        var step = this.winXend - this.winXst;
        this.winXst += step;
        this.winXend += step;
        this.#SVGRepaint();
    }

    #SVGRepaint() {
        if (!this.allResults || !this.allResults.gappedTrace || !this.allResults.gappedTrace.peakA) return;
        this.#checkWindow(this.allResults.gappedTrace.peakA.length - 1);
        var retVal = this.#createSVG(this.allResults, this.winXst, this.winXend, this.winYend, this.frameXst, this.frameXend, this.frameYst, this.frameYend);
        this.#digShowSVG(retVal);
        this.#updateHighlight(this.allResults);
    }

    #displayTextSeq(tr) {
        var seq = "";
        for (var i = 0; i < tr.gappedTrace.basecallPos.length; i++) {
            var base = tr.gappedTrace.basecalls[tr.gappedTrace.basecallPos[i]] + " ";
            var pos = base.indexOf(":");
            seq += base.charAt(pos + 1);
        }
        this.traceSeqString = seq;
        this.#el('traceView-traceSeq').value = this.traceSeqString;
        this.#showElement(this.#el('traceView-Sequence'));

        if (tr.hasOwnProperty('refalign')){
            this.refAlignString = tr.refalign || "";
            this.refSeqGapless = this.refAlignString.replace(/-/g, "");
            var outField2 = this.#el('traceView-refSeq');
            outField2.value = this.refSeqGapless;
            var refSeq = this.#el('traceView-Reference');
            this.#showElement(refSeq);
        } else {
            this.refAlignString = "";
            this.refSeqGapless = "";
        }
        this.#renderSeqView(tr);
        this.#renderRefView(tr);
    }

    // Faster: inline SVG instead of data URL image
    #digShowSVG(svg) {
        var sectionResults = this.#el('traceView-Traces');
        if (sectionResults.firstElementChild && sectionResults.firstElementChild.tagName.toLowerCase() === 'svg') {
            sectionResults.firstElementChild.outerHTML = svg;
        } else {
            sectionResults.innerHTML = svg;
        }
    }

    #createSVG(tr,startX,endX,endY,wdXst,wdXend,wdYst,wdYend) {
        var retVal = this.#createAllCalls(tr,startX,endX,endY,wdXst,wdXend,wdYst,wdYend);
        retVal += this.#createCoodinates (tr,startX,endX,endY,wdXst,wdXend,wdYst,wdYend);
        retVal += "</svg>";
        var head;
        if (tr.hasOwnProperty('refalign')) {
            head = "<svg xmlns='http://www.w3.org/2000/svg' width='100%' viewBox='-60 -40 1200 360'>";
        } else {
            head = "<svg xmlns='http://www.w3.org/2000/svg' width='100%' viewBox='-60 -40 1200 300'>";
        }
        return head + retVal;
    }

    #createCoodinates(tr,startX,endX,endY,wdXst,wdXend,wdYst,wdYend){
        var w = this.#getIntWindow(startX, endX, tr.gappedTrace.peakA.length);
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
        for (var i = 0; i < tr.gappedTrace.basecallPos.length; i++) {
            var base = tr.gappedTrace.basecalls[tr.gappedTrace.basecallPos[i]] + " ";
            var pos = base.indexOf(":");
            prim += base.charAt(pos + 1);
            if (pos + 3 < base.length) {
                sec += base.charAt(pos + 3);
            } else {
                sec += base.charAt(pos + 1);
            }
        }

        // Track min/max reference indices (gapped) for visible bases
        var minRefIdx = null;
        var maxRefIdx = null;

        // The X-Axis
        for (var i = 0; i < tr.gappedTrace.basecallPos.length; i++) {
            var posVal = parseFloat(tr.gappedTrace.basecallPos[i]);
            if ((posVal > startX) && (posVal < endX)) {
                var xPos = wdXst + (posVal - startX) / (endX - startX)  * (wdXend - wdXst);
                var baseChar = prim.charAt(i);
                var qual = (tr.gappedTrace.basecallQual && tr.gappedTrace.basecallQual.length > i) ? tr.gappedTrace.basecallQual[i] : "";
                retVal += "<g class='traceView-base-tick' data-idx='" + i + "' data-pos='" + tr.gappedTrace.basecallPos[i];
                retVal += "' data-base='" + baseChar + "' data-qual='" + qual + "'>";
                retVal += "<line x1='" + xPos + "' y1='" + lineYend;
                retVal += "' x2='" + xPos + "' y2='" + (lineYend + 7)+ "' stroke-width='2' stroke='black' />";
                retVal += "<text x='" + (xPos + 3) + "' y='" + (lineYend + 11);
                retVal += "' font-family='Arial' font-size='10' fill='black' text-anchor='end' transform='rotate(-90 ";
                retVal += (xPos + 3) + "," + (lineYend + 11) + ")'>";
                retVal += tr.gappedTrace.basecalls[tr.gappedTrace.basecallPos[i]] + "</text>";

                if(tr.hasOwnProperty('refalign')){
                    var lg = parseInt(tr.gappedTrace.leadingGaps || 0, 10);
                    if (!(tr.refalign.charAt(i + lg) === prim.charAt(i) && tr.refalign.charAt(i + lg) === sec.charAt(i))) {
                        var refcol = "red";
                        if (tr.refalign.charAt(i + lg) === prim.charAt(i) || tr.refalign.charAt(i + lg) === sec.charAt(i)) {
                            refcol = "orange";
                        }
                        retVal += "<rect x='" + (xPos - 5) + "' y='" + (lineYend + 63);
                        retVal += "' width='10' height='10' style='fill:" + refcol + ";stroke-width:3;stroke:" + refcol + "' />";
                    }
                    retVal += "<text x='" + (xPos + 3) + "' y='" + (lineYend + 71);
                    retVal += "' font-family='Arial' font-size='10' fill='black' text-anchor='end'>";
                    retVal += tr.refalign.charAt(i + lg);
                    retVal +=  "</text>";
                }
                retVal += "</g>";

                // Update min/max reference indices for labels
                if (tr.hasOwnProperty('refalign')) {
                    var refIdx = (parseInt(tr.gappedTrace.leadingGaps || 0, 10)) + i; // 0-based within refalign
                    if (minRefIdx === null || refIdx < minRefIdx) minRefIdx = refIdx;
                    if (maxRefIdx === null || refIdx > maxRefIdx) maxRefIdx = refIdx;
                }
            }
        }

        // Helper: count non-gap bases up to index (inclusive) in refalign
        function refOffset(refalign, idx) {
            if (!refalign || idx === null || idx === undefined) return null;
            var cnt = 0;
            for (var k = 0; k <= idx && k < refalign.length; k++) {
                if (refalign.charAt(k) !== '-') cnt++;
            }
            return cnt > 0 ? cnt - 1 : null; // 0-based offset
        }

        var refOrient = "";
        if(tr.hasOwnProperty('forward')){
            var isRev = !(tr.forward == 1 || tr.forward === "1" || tr.forward === true);
            if(tr.hasOwnProperty('refpos') && minRefIdx !== null && maxRefIdx !== null){
                var refposInt = parseInt(tr.refpos, 10);
                if (isFinite(refposInt)) {
                    var lenGapless = this.refSeqGapless ? this.refSeqGapless.length :
                                 (tr.refalign ? tr.refalign.replace(/-/g,"").length : 0);
                    var offMin = refOffset(tr.refalign, minRefIdx);
                    var offMax = refOffset(tr.refalign, maxRefIdx);
                    if (offMin !== null && offMax !== null) {
                        var leftLabel, rightLabel;
                        if (!isRev) {
                            leftLabel = refposInt + offMin;
                            rightLabel = refposInt + offMax;
                        } else {
                            // Reverse: genomic coords decrease along the trace to the right.
                            // Left edge shows higher coord, right edge lower coord.
                            leftLabel  = refposInt + (lenGapless - 1 - offMin);
                            rightLabel = refposInt + (lenGapless - 1 - offMax);
                        }
                        retVal += "<text x='-5' y='" + (lineYend + 71);
                        retVal += "' font-family='Arial' font-size='10' fill='black' text-anchor='end'>";
                        retVal += leftLabel + "</text>";
                        retVal += "<text x='1005' y='" + (lineYend + 71);
                        retVal += "' font-family='Arial' font-size='10' fill='black' text-anchor='start'>";
                        retVal += rightLabel + "</text>";
                    }
                }
            }
            refOrient = isRev ? " - reverse" : " - forward";
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

    #createAllCalls(tr, startX, endX, endY, wdXst, wdXend, wdYst, wdYend) {
        var w = this.#getIntWindow(startX, endX, tr.gappedTrace.peakA.length);
        return this.#createOneCalls(tr.gappedTrace.peakA, this.baseCol[0], w.s, w.e, endY, wdXst, wdXend, wdYst, wdYend) +
            this.#createOneCalls(tr.gappedTrace.peakC, this.baseCol[1], w.s, w.e, endY, wdXst, wdXend, wdYst, wdYend) +
            this.#createOneCalls(tr.gappedTrace.peakG, this.baseCol[2], w.s, w.e, endY, wdXst, wdXend, wdYst, wdYend) +
            this.#createOneCalls(tr.gappedTrace.peakT, this.baseCol[3], w.s, w.e, endY, wdXst, wdXend, wdYst, wdYend);
    }

    #createOneCalls(trace, col, startX, endX, endY, wdXst, wdXend, wdYst, wdYend) {
        if (endX <= startX) return "";
        var startTag = "<polyline fill='none' stroke-linejoin='round' stroke='" + col[0];
        startTag += "' stroke-width='" + col[1] + "' points='";
        var retVal = "";
        var lastVal = -99;
        var span = (endX - startX);
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

    #errorMessage(err) {
        this.deleteContent();
        var html = '<div id="traceView-error" class="alert alert-danger" role="alert">';
        html += '  <i class="fas a-fire"></i>';
        html += '  <span id="error-message">' + this.#escapeHtml(err);
        html += '  </span>';
        html += '</div>';
        var trTrc = this.#el('traceView-Traces');
        trTrc.innerHTML = html;
    }

    // Harmonize teal and sage
    #normalizeData(res) {
        if (!res || typeof res !== 'object') return res;
        if (res.hasOwnProperty('gappedTrace')) return res;
        if (!res.hasOwnProperty('peakA')) return res;
        var out = {
            gappedTrace: {
                traceFileName: res.traceFileName || "",
                leadingGaps: 0,
                trailingGaps: 0,
                peakA: res.peakA,
                peakC: res.peakC,
                peakG: res.peakG,
                peakT: res.peakT,
                basecallPos: res.basecallPos,
                basecallQual: res.basecallQual,
                basecalls: res.basecalls
            }
        };
        if (res.hasOwnProperty('refchr'))   out.refchr   = res.refchr;
        if (res.hasOwnProperty('refpos'))   out.refpos   = res.refpos;
        if (res.hasOwnProperty('refalign')) out.refalign = res.refalign;
        if (res.hasOwnProperty('forward'))  out.forward  = res.forward;
        return out;
    }

    displayData(res) {
        this.#resetGlobalValues();
        this.allResults = this.#normalizeData(res);

        if (!this.allResults || !this.allResults.hasOwnProperty('gappedTrace')) {
            this.#errorMessage('Bad JSON data: gappedTrace object missing!');
            return;
        }
        var gt = this.allResults.gappedTrace;
        if (!gt.hasOwnProperty('peakA')){
            this.#errorMessage("Bad JSON data: peakA array missing!");
            return;
        }
        if (!gt.hasOwnProperty('peakC')){
            this.#errorMessage("Bad JSON data: peakC array missing!");
            return;
        }
        if (!gt.hasOwnProperty('peakG')){
            this.#errorMessage("Bad JSON data: peakG array missing!");
            return;
        }
        if (!gt.hasOwnProperty('peakT')){
            this.#errorMessage("Bad JSON data: peakT array missing!");
            return;
        }
        if (!gt.hasOwnProperty('basecallPos')){
            this.#errorMessage("Bad JSON data: basecallPos array missing!");
            return;
        }
        if (!gt.hasOwnProperty('basecalls')){
            this.#errorMessage("Bad JSON data: basecalls object missing!");
            return;
        }
        if (gt.hasOwnProperty('basecallQual') && gt.basecallQual.length !== gt.basecallPos.length){
            this.#errorMessage("Bad JSON data: basecallQual length mismatch with basecallPos!");
            return;
        }
        this.#displayTextSeq(this.allResults);
        this.#attachSeqSelectionHandler(this.allResults);
        this.#SVGRepaint();
        var trBtn = this.#el('traceView-Buttons');
        this.#showElement(trBtn);
    }

    deleteContent() {
        var trBtn = this.#el('traceView-Buttons');
        this.#hideElement(trBtn);
        var trTrc = this.#el('traceView-Traces');
        trTrc.innerHTML = '';
        var tooltip = this.#el('traceView-tooltip');
        if (tooltip) this.#hideElement(tooltip);
        var trSeq = this.#el('traceView-Sequence');
        this.#hideElement(trSeq);
        var outField = this.#el('traceView-traceSeq');
        outField.value = '';
        var refSeq = this.#el('traceView-Reference');
        this.#hideElement(refSeq);
        var outField2 = this.#el('traceView-refSeq');
        outField2.value = '';
    }

    // Drag handlers (direction inverted: drag right -> earlier bases)
    #attachDragHandlers() {
        var self = this;
        var traces = this.#el('traceView-Traces');
        if (!traces) return;

        traces.style.cursor = 'grab';

        traces.addEventListener('mousedown', function (e) {
            self.isDragging = true;
            self.dragStartX = e.clientX;
            self.dragWinXst = self.winXst;
            self.dragWinXend = self.winXend;
            traces.style.cursor = 'grabbing';
            e.preventDefault(); // avoid text selection
        });

        let rafPending = false;
        function repaint() {
            rafPending = false;
            self.#SVGRepaint();
        }

        this._onMouseMove = function (e) {
            if (!self.isDragging) return;
            if (!self.allResults || !self.allResults.gappedTrace || !self.allResults.gappedTrace.peakA) return;

            var rect = traces.getBoundingClientRect();
            var widthPx = rect.width || (self.frameXend - self.frameXst);
            if (!widthPx || widthPx <= 0) return;

            var basesPerPx = (self.dragWinXend - self.dragWinXst) / widthPx;
            if (!isFinite(basesPerPx) || basesPerPx === 0) return;

            var dxPx = e.clientX - self.dragStartX;
            var deltaBases = dxPx * basesPerPx;

            // Inverted direction: drag right -> earlier bases
            var newSt = self.dragWinXst - deltaBases;
            var newEnd = self.dragWinXend - deltaBases;

            var maxX = self.allResults.gappedTrace.peakA.length - 1;
            if (newSt < 0) { newEnd -= newSt; newSt = 0; }
            if (newEnd > maxX) {
                var over = newEnd - maxX;
                newSt = Math.max(0, newSt - over);
                newEnd = maxX;
            }
            if (newEnd - newSt < 10) newEnd = newSt + 10;

            self.winXst = newSt;
            self.winXend = newEnd;
            self.#checkWindow(maxX);

            if (!rafPending) {
                rafPending = true;
                requestAnimationFrame(repaint);
            }
        };

        this._onMouseUp = function () {
            self.isDragging = false;
            traces.style.cursor = 'grab';
        };

        this._onMouseLeaveWin = this._onMouseUp;

        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('mouseup', this._onMouseUp);
        window.addEventListener('mouseleave', this._onMouseLeaveWin);
    }

    // Mouse wheel zoom (over the trace view)
    #attachWheelZoom() {
        var self = this;
        var traces = this.#el('traceView-Traces');
        if (!traces) return;

        traces.addEventListener('wheel', function (e) {
            if (!self.allResults || !self.allResults.gappedTrace || !self.allResults.gappedTrace.peakA) return;

            e.preventDefault(); // stop page scroll

            var rect = traces.getBoundingClientRect();
            var widthPx = rect.width || (self.frameXend - self.frameXst);
            if (!widthPx || widthPx <= 0) return;

            var span = self.winXend - self.winXst;
            if (span <= 0) return;

            // Mouse position in bases
            var relPx = e.clientX - rect.left;
            var relRatio = Math.min(1, Math.max(0, relPx / widthPx));
            var centerBase = self.winXst + relRatio * span;

            // Zoom factor
	    var cDelta = Math.sign(e.deltaY); // -1, 0, or +1
	    var factor = (cDelta < 0) ? 0.95 : 1.05; // zoom in / zoom out
            var newSpan = span * factor;
            if (newSpan < 10) newSpan = 10;

            var newSt = centerBase - relRatio * newSpan;
            var newEnd = newSt + newSpan;

            var maxX = self.allResults.gappedTrace.peakA.length - 1;
            if (newSt < 0) { newEnd -= newSt; newSt = 0; }
            if (newEnd > maxX) {
                var over = newEnd - maxX;
                newSt = Math.max(0, newSt - over);
                newEnd = maxX;
            }
            if (newEnd - newSt < 10) newEnd = newSt + 10;

            self.winXst = newSt;
            self.winXend = newEnd;
            self.#checkWindow(maxX);

            requestAnimationFrame(function () { self.#SVGRepaint(); });
        }, { passive: false });
    }

    // Hover tooltip over base ticks
    #attachTooltipHandlers() {
        var self = this;
        var traces = this.#el('traceView-Traces');
        var tooltip = this.#el('traceView-tooltip');
        if (!traces || !tooltip) return;

        function hideTooltip() {
            tooltip.classList.add('d-none');
        }

        traces.addEventListener('mouseleave', hideTooltip);

        traces.addEventListener('mousemove', function (e) {
            var target = e.target.closest('.traceView-base-tick');
            if (!target) {
                hideTooltip();
                return;
            }
            var base = target.dataset.base || "";
            var qual = target.dataset.qual || "";
            tooltip.innerHTML = "<div><strong>Base:</strong> " + self.#escapeHtml(base) + "</div><div><strong>Quality:</strong> " + self.#escapeHtml(qual) + '</div>';
            tooltip.style.left = (e.clientX + window.scrollX + 12) + "px";
            tooltip.style.top = (e.clientY + window.scrollY + 12) + "px";
            tooltip.classList.remove('d-none');
        });
    }

    // Select-to-center-and-zoom on chromatogram sequence (span-based)
    #attachSeqSelectionHandler(tr) {
        var self = this;
        var view = this.#el('traceView-traceSeqView');
        if (!view || !tr || !tr.gappedTrace || !tr.gappedTrace.basecallPos || !tr.gappedTrace.basecallPos.length) return;

        if (this._seqSelectionHandler) {
            view.removeEventListener('mouseup', this._seqSelectionHandler);
            view.removeEventListener('keyup', this._seqSelectionHandler);
            view.removeEventListener('select', this._seqSelectionHandler);
        }

        function getSpanIndex(node){
            while (node && node !== view){
                if (node.dataset && node.dataset.idx) return parseInt(node.dataset.idx, 10);
                node = node.parentNode;
            }
            return null;
        }

        this._seqSelectionHandler = () => {
            var sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            var range = sel.getRangeAt(0);
            var startIdx = getSpanIndex(range.startContainer);
            var endIdx = getSpanIndex(range.endContainer);
            if (startIdx === null || endIdx === null) return;
            if (range.endOffset === 0) endIdx = endIdx - 1;
            if (startIdx > endIdx) { var t=startIdx; startIdx=endIdx; endIdx=t; }
            startIdx = Math.max(0,startIdx);
            endIdx = Math.min(tr.gappedTrace.basecallPos.length-1, endIdx);
            if (endIdx < startIdx) return;

            var startBase = parseFloat(tr.gappedTrace.basecallPos[startIdx]);
            var endBase   = parseFloat(tr.gappedTrace.basecallPos[endIdx]);
            if (!isFinite(startBase) || !isFinite(endBase)) return;

            var selSpan = Math.max(1, endBase - startBase + 1);
            var spanWithMargin = Math.max(10, selSpan * 1.2);
            var centerBase = (startBase + endBase) / 2;

            self.winXst = centerBase - spanWithMargin / 2;
            self.winXend = centerBase + spanWithMargin / 2;

            self.#checkWindow(tr.gappedTrace.peakA.length - 1);
            self.#SVGRepaint();
        };

        view.addEventListener('mouseup', this._seqSelectionHandler);
        view.addEventListener('keyup', this._seqSelectionHandler);
        view.addEventListener('select', this._seqSelectionHandler);
    }

    // Render and highlight current view
    #renderSeqView(tr) {
        var view = this.#el('traceView-traceSeqView');
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
        var len = Math.min(this.traceSeqString.length, tr.gappedTrace.basecallPos.length);
        var maxX = tr.gappedTrace.peakA.length - 1;

        this.#checkWindow(maxX);
        for (var i=0;i<len;i++){
            if (i > 0 && i % wrapLen === 0) {
                html.push('<br>');
            }
            var b = this.traceSeqString.charAt(i);
            var posVal = parseFloat(tr.gappedTrace.basecallPos[i]);
            var inView = (posVal >= this.winXst && posVal <= this.winXend);
            var cls = inView ? 'text-primary font-weight-bold' : '';
            html.push('<span data-idx="'+i+'" class="'+cls+'">' + this.#escapeHtml(b) + '</span>');
        }
        view.innerHTML = html.join('');
        this.#centerSeqViewOnHighlight(view);
    }

    #centerSeqViewOnHighlight(view) {
        var first = view.querySelector('span.text-primary');
        if (!first) return;
        if (view.scrollHeight <= view.clientHeight) return;
        var target = first.offsetTop - (view.clientHeight / 2) + (first.offsetHeight / 2);
        view.scrollTop = Math.max(0, target);
    }

    // Reference render and highlight (gapped reference, aligned to trace)
    #renderRefView(tr) {
        var view = this.#el('traceView-refSeqView');
        if (!view || !this.refAlignString) return;

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
        var lg = parseInt(tr.gappedTrace.leadingGaps || 0, 10);
        var len = this.refAlignString.length;
        var maxX = tr.gappedTrace.peakA.length - 1;
        this.#checkWindow(maxX);

        var highlightIdx = {};
        for (var i = 0; i < tr.gappedTrace.basecallPos.length; i++) {
            var posVal = parseFloat(tr.gappedTrace.basecallPos[i]);
            if (posVal >= this.winXst && posVal <= this.winXend) {
                highlightIdx[i + lg] = true;
            }
        }

        for (var j=0;j<len;j++){
            if (j > 0 && j % wrapLen === 0) {
                html.push('<br>');
            }
            var c = this.refAlignString.charAt(j);
            var cls = highlightIdx[j] ? 'text-primary font-weight-bold' : '';
            html.push('<span class="' + cls + '">' + this.#escapeHtml(c) + '</span>');
        }
        view.innerHTML = html.join('');
    }

    // Highlight update wrapper
    #updateHighlight(tr){
        this.#renderSeqView(tr);
        this.#renderRefView(tr);
    }

    // Copy bases currently visible in the trace window
    #copyViewRange() {
        if (!this.allResults || !this.allResults.gappedTrace || !this.allResults.gappedTrace.basecallPos || !this.traceSeqString) return;
        var len = Math.min(this.traceSeqString.length, this.allResults.gappedTrace.basecallPos.length);
        var startIdx = 0;
        while (startIdx < len && parseFloat(this.allResults.gappedTrace.basecallPos[startIdx]) < this.winXst) startIdx++;
        var endIdx = startIdx;
        while (endIdx < len && parseFloat(this.allResults.gappedTrace.basecallPos[endIdx]) <= this.winXend) endIdx++;
        var textToCopy = this.traceSeqString.slice(startIdx, endIdx);
        this.#doCopy(textToCopy);
    }

    // Copy full chromatogram sequence
    #copyFull() {
        this.#doCopy(this.traceSeqString || '');
    }

    // Copy visible reference (aligned, gapped)
    #copyRefViewRange() {
        if (!this.refAlignString || !this.allResults || !this.allResults.gappedTrace) return;
        var lg = parseInt(this.allResults.gappedTrace.leadingGaps || 0, 10);
        var len = this.refAlignString.length;
        var startIdx = len;
        var endIdx = 0;
        for (var i = 0; i < this.allResults.gappedTrace.basecallPos.length; i++) {
            var posVal = parseFloat(this.allResults.gappedTrace.basecallPos[i]);
            if (posVal >= this.winXst && posVal <= this.winXend) {
                var refIdx = i + lg;
                startIdx = Math.min(startIdx, refIdx);
                endIdx = Math.max(endIdx, refIdx);
            }
        }
        if (startIdx > endIdx) return;
        var textToCopy = this.refAlignString.slice(startIdx, endIdx + 1).replace(/-/g, '');
        this.#doCopy(textToCopy);
    }

    // Copy full reference (gapless)
    #copyRefFull() {
        this.#doCopy(this.refSeqGapless || "");
    }

    // Clipboard helpers
    #doCopy(text) {
        const fallbackCopy = this.#fallbackCopy.bind(this);
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(function(){ fallbackCopy(text); });
        } else {
            fallbackCopy(text);
        }
    }

    #fallbackCopy(text) {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'absolute';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch(e) {}
            document.body.removeChild(ta);
    }

    // Escape helper
    #escapeHtml(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g, "&gt;"); }
}
