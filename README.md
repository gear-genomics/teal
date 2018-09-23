# Teal
Visualize trace files.

Dependencies
------------

Teal requires Tracy, please intall first:

`https://github.com/gear-genomics/tracy`


Install a local copy for testing
--------------------------------

`git clone https://github.com/gear-genomics/teal.git`

`cd teal`

Setup and run the server
------------------------

The server runs in a terminal

Install the dependencies:

`sudo apt install python python-pip`

`pip install flask flask_cors`

Start the server:

`cd PATH_TO_TEAL/teal`

`export PATH=$PATH:/PATH_TO_TRACY/tracy/bin`

`echo $PATH`

`python server/server.py`

Setup and run the client
------------------------

The client requires a different terminal

Install the dependencies:

`cd PATH_TO_TEAL/teal/client`

`sudo apt install npm`

`sudo npm install -g parcel-bundler`

`sudo npm install babel-install`

`sudo npm install --save-dev babel-core`

`sudo npm install --save-dev babel-plugin-transform-runtime`

`sudo npm install --save babel-runtime`

Start the client:

`cd PATH_TO_TEAL/teal/client`

`npm run dev`


