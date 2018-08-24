/**
 * Facade for pngquant lib which handles mounting of input file and exposing output file
 * @param  {object}   file     Arraybuffer of image data[png]
 * @param  {object}   options  command line options to be passed to pngquant exec
 * @param  {function} printF   Custom print function to handle stdout logs
 * @return {object}            Object containing processed png image data in `data` key
 */

function pngquant(file, options, printF) {
	/* Wrapper around pngquant exec */

	// This is to handle the case when we call the function without any argument in order to save it
	// from google clojure compiler which removes this :p
	if(typeof file === 'undefined')
		return;

	var stdout = "";
	var stderr = "";

	/* Default arguments to append -new.png to input file name */
	var args = ['--ext','-new.png'];

	/* Create command line options to passed using input `options` object */
	for (var key in options) {
		if (typeof options[key] == 'string') {
			args.push("--" + key);
			args.push(options[key]);
		}
	}

	/**
	 * We'll mount input file at MEMFS at input.png to ease up the things since
	 * only 1 image will be processed at a time
	 */
	args.push("/input.png");

	/* Creating top level module which will be used by pngqauntjs */
	var Module = {
		"print": printF,
		"printErr": printF,

		/* Mounting input file at input.png at root location */
		"preRun": [function() {
			FS.writeFile("/input.png", file, {
				encoding: "binary"
			});
		}],
		"arguments": args,
		"ENVIRONMENT": "SHELL" // maximum compatibility?
	};
