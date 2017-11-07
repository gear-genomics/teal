/* global Mustache, XMLHttpRequest, c3 */

var submitButton = document.getElementById('submit-button')
submitButton.addEventListener('click', submit)
var spinnerHtml = '<i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i>'
var resultsTemplate = document.getElementById('tmpl-results').innerHTML
Mustache.parse(resultsTemplate)

function submit () {
    var file = document.getElementById('experiment').files[0];
    var data = new FormData();
    data.append('experiment', file);
    var req = new XMLHttpRequest()
    req.addEventListener('load', displayResults)
    req.open('POST', '/upload', true)
    req.send(data)
    document.getElementById('results').innerHTML = spinnerHtml
}

function displayResults () {
    var results = JSON.parse(this.responseText)
    console.log("results: ", results)
    var resultsRendered = Mustache.render(resultsTemplate, results)
    document.getElementById('results').innerHTML = resultsRendered
    c3.generate({
	bindto: '#chart',
	data: {
	    columns: [
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
