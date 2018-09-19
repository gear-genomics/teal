const API_URL = process.env.API_URL

var traceView = require('./traceView');

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
const resultInfo = document.getElementById('result-info')
const resultError = document.getElementById('result-error')
var sectionResults = document.getElementById('results')

// TODO client-side validation
function run() {
  const formData = new FormData()
  formData.append('queryFile', inputFile.files[0])
  hideElement(resultError)
  traceView.deleteContent()
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
      traceView.deleteContent()
      resultError.querySelector('#error-message').textContent = errorMessage
    })
}

async function handleSuccess(res) {
    hideElement(resultInfo)
    hideElement(resultError)
    traceView.displayData(res.data)
}

function showExample() {
    resultLink.click()
    const formData = new FormData()
    formData.append('showExample', 'showExample')
    traceView.deleteContent()
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


