#! /usr/bin/env python

import os
import uuid
import re
import subprocess
import argparse
import json
from subprocess import call
from flask import Flask, send_file, flash, send_from_directory, request, redirect, url_for, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)
TEALWS = os.path.dirname(os.path.abspath(__file__))

app.config['TEAL'] = os.path.join(TEALWS, "..")
app.config['UPLOAD_FOLDER'] = os.path.join(app.config['TEAL'], "data")
app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024   #maximum of 8MB
app.config['BASEURL'] = '/teal'
app.static_folder = app.static_url_path = os.path.join(TEALWS, "../client/static")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in set(['abi','ab1','ab!','ab'])

@app.route('/upload', methods=['POST'])
def generate():
    uuidstr = str(uuid.uuid4())
        
    # Get subfolder
    sf = os.path.join(app.config['UPLOAD_FOLDER'], uuidstr[0:2])
    if not os.path.exists(sf):
        os.makedirs(sf)
       
    if request.form['sample'] == 'sample':
        fexpname = os.path.join(TEALWS, "sample.abi")
    else:
        if 'experiment' not in request.files:
            return jsonify(errors = [{"title": "Experiment file is missing!"}]), 400
        fexp = request.files['experiment']
        if fexp.filename == '':
            return jsonify(errors = [{"title": "Experiment file is missing!"}]), 400
        if not allowed_file(fexp.filename):
            return jsonify(errors = [{"title": "Experiment file has incorrect file type!"}]), 400 
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
        return jsonify(errors = [{"title": "Error in running basecalling trace file!"}]), 400 
    return jsonify(data = json.loads(open(outfile).read()))

@app.route('/')
def root():
    return send_from_directory(os.path.join(TEALWS, "../client"),"index.html"), 200


if __name__ == '__main__':
    app.run(host = '0.0.0.0', port=3300, debug = True, threaded=True)
