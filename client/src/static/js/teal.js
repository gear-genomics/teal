const API_URL = process.env.API_URL

$('#mainTab a').on('click', function(e) {
  e.preventDefault()
  $(this).tab('show')
})

const resultLink = document.getElementById('link-results')

const submitButton = document.getElementById('btn-submit')
submitButton.addEventListener('click', function() {
  resultLink.click()
  run()
})

const exampleButton = document.getElementById('btn-example')
exampleButton.addEventListener('click', showExample)

const inputFile = document.getElementById('inputFile')
const resultContainer = document.getElementById('result-container')
const resultInfo = document.getElementById('result-info')
const resultError = document.getElementById('result-error')
var sectionResults = document.getElementById('results')

// TODO client-side validation
function run() {
  const formData = new FormData()
  formData.append('queryFile', inputFile.files[0])
  hideElement(resultContainer)
  hideElement(resultError)
  showElement(resultInfo)

  axios
    .post(`${API_URL}/upload`, formData)
    .then(res => {
	if (res.status === 200) {
          handleSuccess(res.data)
      }
    })
    .catch(err => {
      let errorMessage = err
      if (err.response) {
        errorMessage = err.response.data.errors
          .map(error => error.title)
          .join('; ')
      }
      hideElement(resultInfo)
      showElement(resultError)
      resultError.querySelector('#error-message').textContent = errorMessage
    })
}

async function handleSuccess(res) {
    hideElement(resultInfo)
    hideElement(resultError)
    showElement(resultContainer)
    displayData(res)
}

function showExample() {
    resultLink.click()
    const formData = new FormData()
    formData.append('showExample', 'showExample')
    hideElement(resultContainer)
    hideElement(resultError)
    showElement(resultInfo)
    axios
	.post(`${API_URL}/upload`, formData)
	.then(res => {
	    if (res.status === 200) {
		handleSuccess(res.data)
	    }
	})
	.catch(err => {
	    let errorMessage = err
	    if (err.response) {
		errorMessage = err.response.data.errors
		    .map(error => error.title)
		    .join('; ')
	    }
	    hideElement(resultInfo)
	    showElement(resultError)
	    resultError.querySelector('#error-message').textContent = errorMessage
	})
}

function showElement(element) {
  element.classList.remove('d-none')
}

function hideElement(element) {
  element.classList.add('d-none')
}

var navBwWinButton = document.getElementById('teal-nav-bw-win')
navBwWinButton.addEventListener('click', tealNavBwWin)
var navBwBitButton = document.getElementById('teal-nav-bw-bit')
navBwBitButton.addEventListener('click', tealNavBwBit)
var navZoomYinButton = document.getElementById('teal-nav-zy-in')
navZoomYinButton.addEventListener('click', tealNavZoomYin)
var navZoomYoutButton = document.getElementById('teal-nav-zy-out')
navZoomYoutButton.addEventListener('click', tealNavZoomYout)
var navZoomXinButton = document.getElementById('teal-nav-zx-in')
navZoomXinButton.addEventListener('click', tealNavZoomXin)
var navZoomXoutButton = document.getElementById('teal-nav-zx-out')
navZoomXoutButton.addEventListener('click', tealNavZoomXout)
var navFwBitButton = document.getElementById('teal-nav-fw-bit')
navFwBitButton.addEventListener('click', tealNavFwBit)
var navFwWinButton = document.getElementById('teal-nav-fw-win')
navFwWinButton.addEventListener('click', tealNavFwWin)
var navHiAButton = document.getElementById('teal-nav-hi-a')
navHiAButton.addEventListener('click', tealNavHiA)
var navHiCButton = document.getElementById('teal-nav-hi-c')
navHiCButton.addEventListener('click', tealNavHiC)
var navHiGButton = document.getElementById('teal-nav-hi-g')
navHiGButton.addEventListener('click', tealNavHiG)
var navHiTButton = document.getElementById('teal-nav-hi-t')
navHiTButton.addEventListener('click', tealNavHiT)
var navHiNButton = document.getElementById('teal-nav-hi-n')
navHiNButton.addEventListener('click', tealNavHiN)

var tealWinXst = 0;
var tealWinXend = 600;
var tealWinYend = 2300;
var tealAllResults;

var tealBaseCol = [["green",1.5],["blue",1.5],["black",1.5],["red",1.5]];


function tealNavFaintCol() {
    tealBaseCol = [["#a6d3a6",1.5],["#a6a6ff",1.5],["#a6a6a6",1.5],["#ffa6a6",1.5]];
}


function tealNavHiN() {
    tealBaseCol = [["green",1.5],["blue",1.5],["black",1.5],["red",1.5]];
    tealSVGRepaint();
}

function tealNavHiA() {
    tealNavFaintCol();
    tealBaseCol[0] = ["green",2.5];
    tealSVGRepaint();    
}

function tealNavHiC() {
    tealNavFaintCol();
    tealBaseCol[1] = ["blue",2.5];
    tealSVGRepaint();
}

function tealNavHiG() {
    tealNavFaintCol();
    tealBaseCol[2] = ["black",2.5];
    tealSVGRepaint();
}

function tealNavHiT() {
    tealNavFaintCol();
    tealBaseCol[3] = ["red",2.5];
    tealSVGRepaint();
}

function tealNavBwBit() {
    var oldStep = tealWinXend - tealWinXst;
    var step = Math.floor(oldStep/3);
    tealWinXst -= step;
    tealWinXend -= step;
    if (tealWinXst < 0) {
        tealWinXst = 0;
        tealWinXend = oldStep;
    }
    tealSVGRepaint();
}

function tealNavBwWin() {
    var step = tealWinXend - tealWinXst;
    tealWinXst -= step;
    tealWinXend -= step;
    if (tealWinXst < 0) {
        tealWinXst = 0;
        tealWinXend = step;
    }
    tealSVGRepaint();
}

function tealNavZoomYin() {
    tealWinYend = tealWinYend * 3 / 4;
    tealSVGRepaint();
}

function tealNavZoomYout() {
    tealWinYend = tealWinYend * 4 / 3;
    tealSVGRepaint();
}

function tealNavZoomXin() {
    var oldStep = tealWinXend - tealWinXst;
    var center = tealWinXst + oldStep / 2;
    var step = Math.floor(oldStep * 3 / 4);
    tealWinXst = Math.floor(center - step / 2);
    tealWinXend = Math.floor(center + step / 2);
    tealSVGRepaint();
}

function tealNavZoomXout() {
    var oldStep = tealWinXend - tealWinXst;
    var center = tealWinXst + oldStep / 2;
    var step = Math.floor(oldStep * 4 / 3);
    tealWinXst = Math.floor(center - step / 2);
    tealWinXend = Math.floor(center + step / 2);
    if (tealWinXst < 0) {
        tealWinXst = 0;
        tealWinXend = step;
    }
    tealSVGRepaint();
}

function tealNavFwBit() {
    var step = Math.floor((tealWinXend - tealWinXst)/3);
    tealWinXst += step;
    tealWinXend += step;
    tealSVGRepaint();
}

function tealNavFwWin() {
    var step = tealWinXend - tealWinXst;
    tealWinXst += step;
    tealWinXend += step;
    tealSVGRepaint();
}

function tealSVGRepaint(){
    var retVal = tealCreateSVG(tealAllResults,tealWinXst,tealWinXend,tealWinYend,0,1000,0,200);
    tealDigShowSVG(retVal, 1200, 380);
}

function tealDisplayTextSeq (tr) {
    var seq = "";
    for (var i = 0; i < tr.basecallPos.length; i++) {
        var base = tr.basecalls[tr.basecallPos[i]] + " ";
        var pos = base.indexOf(":");
    //    if ((i % 60) === 0 && i != 0) {
    //        seq += "\n";
    //    }
        seq += base.charAt(pos + 1);
    }
    var outField = document.getElementById('teal-fastaText')
    outField.value = seq;
}

function tealDigShowSVG(svg, x, y) {
    var retVal = svg;
    var regEx1 = /</g;
    retVal = retVal.replace(regEx1, "%3C");
    var regEx2 = />/g;
    retVal = retVal.replace(regEx2, "%3E");
    var regEx3 = /#/g;
    retVal = retVal.replace(regEx3, "%23");
    retVal = '<img src="data:image/svg+xml,' + retVal;
    retVal += '" alt="Digest-SVG" width="' + x + '" height="' + y +'">';
    sectionResults.innerHTML = retVal;
}

function tealCreateSVG(tr,startX,endX,endY,wdXst,wdXend,wdYst,wdYend) {
    var retVal = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='-50 -50 1100 350'>";

    retVal += tealCreateAllCalls(tr,startX,endX,endY,wdXst,wdXend,wdYst,wdYend);
    retVal += tealCreateCoodinates (tr,startX,endX,endY,wdXst,wdXend,wdYst,wdYend);

    retVal += "</svg>";
    return retVal;
}

function tealCreateCoodinates (tr,startX,endX,endY,wdXst,wdXend,wdYst,wdYend){
    var lineXst = wdXst - 5;
    var lineXend = wdXend + 5;
    var lineYst = wdYst - 5;
    var lineYend = wdYend + 5;
    var retVal = "<line x1='" + lineXst + "' y1='" + lineYend;
    retVal += "' x2='" + lineXend + "' y2='" + lineYend + "' stroke-width='2' stroke='black' stroke-linecap='square'/>";
    retVal += "<line x1='" + lineXst + "' y1='" + lineYst;
    retVal += "' x2='" + lineXst + "' y2='" + lineYend + "' stroke-width='2' stroke='black' stroke-linecap='square'/>";

    // The X-Axis
    for (var i = 0; i < tr.basecallPos.length; i++) {
        if ((parseFloat(tr.basecallPos[i]) > startX) &&
            (parseFloat(tr.basecallPos[i]) < endX)) {
            var xPos = wdXst + (parseFloat(tr.basecallPos[i]) - startX) / (endX - startX)  * (wdXend - wdXst);
            retVal += "<line x1='" + xPos + "' y1='" + lineYend;
            retVal += "' x2='" + xPos + "' y2='" + (lineYend + 7)+ "' stroke-width='2' stroke='black' />";
            retVal += "<text x='" + (xPos + 3) + "' y='" + (lineYend + 11);
            retVal += "' font-family='Arial' font-size='10' fill='black' text-anchor='end' transform='rotate(-90 ";
            retVal += (xPos + 3) + "," + (lineYend + 11) + ")'>";
            retVal += tr.basecalls[tr.basecallPos[i]] + "</text>";
        } 
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
   
    var sqrY = wdYend + 70;
    var txtY = wdYend + 81;
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

function tealCreateAllCalls(tr,startX,endX,endY,wdXst,wdXend,wdYst,wdYend){
    var retVal = tealCreateOneCalls(tr.peakA,tealBaseCol[0],startX,endX,endY,wdXst,wdXend,wdYst,wdYend);
    retVal += tealCreateOneCalls(tr.peakC,tealBaseCol[1],startX,endX,endY,wdXst,wdXend,wdYst,wdYend);
    retVal += tealCreateOneCalls(tr.peakG,tealBaseCol[2],startX,endX,endY,wdXst,wdXend,wdYst,wdYend);
    retVal += tealCreateOneCalls(tr.peakT,tealBaseCol[3],startX,endX,endY,wdXst,wdXend,wdYst,wdYend);
    return retVal;
}

function tealCreateOneCalls(trace,col,startX,endX,endY,wdXst,wdXend,wdYst,wdYend){
    var retVal = "<polyline fill='none' stroke-linejoin='round' stroke='" + col[0];
    retVal += "' stroke-width='" + col[1] + "' points='";
    for (var i = startX; i < endX; i++) {
        if(!(typeof trace[i] === 'undefined')){
            var iden = parseFloat(trace[i]) / endY;
            if (iden > 1.0) {
                iden = 1;
            }
            var xPos = wdXst + (i - startX) / (endX - startX)  * (wdXend - wdXst);
            var yPos = wdYend - iden * (wdYend - wdYst);
            retVal += xPos + "," + yPos + " ";
        } 
    }
    retVal += "'/>";
    return retVal;
}

function displayData(res) {
    tealAllResults = res.data
    tealWinXst = 0;
    tealWinXend = 600;
    tealWinYend = 2300;
    tealDisplayTextSeq (tealAllResults);
    var retVal = tealCreateSVG(tealAllResults,tealWinXst,tealWinXend,tealWinYend,0,1000,0,200);
    tealDigShowSVG(retVal, 1200, 380);
}



