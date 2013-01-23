all:
	node_modules/uglify-js/bin/uglifyjs lib/*.js player.js index.js > everything.js

