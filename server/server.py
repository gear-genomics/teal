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

TEALWS = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
CORS(app)
app.config['TEAL'] = os.path.join(TEALWS, "..")
app.config['UPLOAD_FOLDER'] = os.path.join(app.config['TEAL'], "data")
app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024   #maximum of 8MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in set(['scf','abi','ab1','ab!','ab'])

@app.route('/api/v1/upload', methods=['POST'])
def upload_file():
    if request.method == 'POST':
        uuidstr = str(uuid.uuid4())
        
        # Get subfolder
        sf = os.path.join(app.config['UPLOAD_FOLDER'], uuidstr[0:2])
        if not os.path.exists(sf):
            os.makedirs(sf)
       
        if 'showExample' in request.form.keys():
            fexpname = os.path.join(TEALWS, "sample.abi")
        else:
            if 'queryFile' not in request.files:
                return jsonify(errors = [{"title": "Chromatogram file is missing!"}]), 400
            fexp = request.files['queryFile']
            if fexp.filename == '':
                return jsonify(errors = [{"title": "Chromatogram file name is missing!"}]), 400
            if not allowed_file(fexp.filename):
                return jsonify(errors = [{"title": "Chromatogram file has incorrect file type!"}]), 400 
            fexpname = os.path.join(sf, "teal_" + uuidstr + "_" + secure_filename(fexp.filename))
            fexp.save(fexpname)

        # Run teal
        outfile = os.path.join(sf, "teal_" + uuidstr + ".json")
        logfile = os.path.join(sf, "teal_" + uuidstr + ".log")
        errfile = os.path.join(sf, "teal_" + uuidstr + ".err")
        with open(logfile, "w") as log:
            with open(errfile, "w") as err:
                try:
                    return_code = call(['tracy', 'basecall', '-o', outfile, fexpname], stdout=log, stderr=err)
                except OSError as e:
                    if e.errno == os.errno.ENOENT:
                        return jsonify(errors = [{"title": "Binary ./tracy not found!"}]), 400
                    else:
                        return jsonify(errors = [{"title": "OSError " + str(e.errno)  + " running binary ./tracy!"}]), 400
        if return_code != 0:
            errInfo = "!"
            with open(errfile, "r") as err:
                errInfo = ": " + err.read()
            return jsonify(errors = [{"title": "Error in running teal" + errInfo}]), 400
        return jsonify(data = json.loads(open(outfile).read()))
    return jsonify(errors = [{"title": "Error in handling POST request!"}]), 400

@app.route('/api/v1/health', methods=['GET'])
def health():
    return jsonify(status="OK")

if __name__ == '__main__':
    app.run(host = '0.0.0.0', port=3300, debug = True, threaded=True)
