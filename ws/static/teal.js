/* global Mustache, XMLHttpRequest, c3 */

var submitButton = document.getElementById('submit-button')
submitButton.addEventListener('click', submit)
var spinnerHtml = '<i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i>'
var sectionResults = document.getElementById('results')

function submit () {
    var file = document.getElementById('experiment').files[0];
    var data = new FormData();
    data.append('experiment', file);
    var req = new XMLHttpRequest()
    req.addEventListener('load', function (ev) {
      var res = JSON.parse(ev.target.response)
      if (ev.target.status === 200) {
        displayResults(res)
      } else {
        sectionResults.innerHTML = '<div class="error">' + res.error + '</div>'
      }
    })
    req.open('POST', '/upload', true)
    req.send(data)
    sectionResults.innerHTML = spinnerHtml
}

function displayResults (results) {
    console.log("results", results)
  sectionResults.innerHTML = '<div id="chart"></div>'
  c3.generate({
      bindto: '#chart',
      data: {
	  x: 'pos',
	  columns: [
	      ['pos'].concat(results.pos),
	      ['A'].concat(results.peakA),
	      ['C'].concat(results.peakC),
	      ['G'].concat(results.peakG),
	      ['T'].concat(results.peakT)
	  ],
	  type: "spline",
      },
      point: {
	  show: false
      },
      axis: {
	  x: {
	      label: "Position",
	      tick: {
		  count: 1
	      },
	      extent: [1, 500]
	  }
      },
      zoom: {
	  enabled: true
      }
  })
}
