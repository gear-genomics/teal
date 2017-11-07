#! /usr/bin/env python

import os
import uuid
import re
import subprocess
import argparse
import json
from subprocess import call
from flask import Flask, send_file, flash, render_template, request, redirect, url_for, jsonify
from werkzeug.utils import secure_filename

app = Flask(__name__)

TEALWS = os.path.dirname(os.path.abspath(__file__))

app.config['TEAL'] = os.path.join(TEALWS, "..")
app.config['UPLOAD_FOLDER'] = os.path.join(app.config['TEAL'], "data")
app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024   #maximum of 8MB
app.config['BASEURL'] = ''

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in set(['ab1'])

@app.route('/upload', methods=['GET', 'POST'])
def generate():
    if request.method == 'POST':
        uuidstr = str(uuid.uuid4())
        
        # Get subfolder
        sf = os.path.join(app.config['UPLOAD_FOLDER'], uuidstr[0:2])
        if not os.path.exists(sf):
            os.makedirs(sf)
        
        if 'experiment' not in request.files:
            return jsonify(error = "Experiment file missing!"), 400
        fexp = request.files['experiment']
        if fexp.filename == '':
            return jsonify(error = "Experiment file missing!"), 400
        if not allowed_file(fexp.filename):
            return jsonify(error = "Experiment file has incorrect file type!"), 400
        fexpname = os.path.join(sf, "teal_" + uuidstr + "_" + secure_filename(fexp.filename))
        fexp.save(fexpname)

        # Run teal
        outfile = os.path.join(sf, "teal_" + uuidstr + ".json")
        tsvfile = os.path.join(sf, "teal_" + uuidstr + ".tsv")
        logfile = os.path.join(sf, "teal_" + uuidstr + ".log")
        errfile = os.path.join(sf, "teal_" + uuidstr + ".err")
        with open(logfile, "w") as log:
            with open(errfile, "w") as err:
                texe = os.path.join(app.config['TEAL'], "./src/teal")
                return_code = call([texe, fexpname, outfile, tsvfile], stdout=log, stderr=err)
        if return_code != 0:
            return jsonify(error = "Error in running Teal!"), 500
        return jsonify(json.loads(open(outfile).read()))
    return render_template('index.html', baseurl = app.config['BASEURL'])


@app.route('/')
def root():
    return render_template('index.html', baseurl = app.config['BASEURL'])


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3300, debug=True, threaded=True)
