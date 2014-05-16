var es = require('event-stream');
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');
var async = require('async');
var PluginError = require('gulp-util').PluginError;
var winExt = /^win/.test(process.platform)?".cmd":"";


// optimization: cache for protractor binaries directory
var protractorDir = null;

function getProtractorDir() {
	if (protractorDir) {
		return protractorDir;
	}
	
	// how deep are we wrt filesystem root?
	var cwd = path.resolve(".");
	var depth = /^win/.test(process.platform) ? cwd.match(/\\/g).length :  cwd.match(/\//g).length;
	depth = depth - 1;
	
	var result = "./node_modules";
	var count = 0;
	while (count <= depth)
	{
		if (fs.existsSync(path.resolve(result + "/.bin/protractor")))
		{
			protractorDir = result + "/.bin";
			return protractorDir;
		}
		result = "../" + result;
		count++;
	}
	throw new Error("No protractor installation found.");	
}

var protractor = function(options) {
	var files = [],
		child, args;

	options = options || {};
	args = options.args || [];

	if (!options.configFile) {
		this.emit('error', new PluginError('gulp-protractor', 'Please specify the protractor config file'));
	}
	return es.through(function(file) {
		files.push(file.path);
	}, function() {
		var stream = this;

		// Attach Files, if any
		if (files.length) {
			args.push('--specs');
			args.push(files.join(','));
		}

		// Pass in the config file
		args.unshift(options.configFile);

		child = child_process.spawn(path.resolve(getProtractorDir() + '/protractor'+winExt), args, {
			stdio: 'inherit'
		}).on('exit', function(code) {
			if (child) {
				child.kill();
			}
			if (stream) {
				if (code) {
					stream.emit('error', new PluginError('gulp-protractor', 'protractor exited with code ' + code));
				}
				else {
					stream.emit('end');
				}
			}
		});
	});
};

var webdriver_update = function(cb) {
	child_process.spawn(path.resolve(getProtractorDir() + '/webdriver-manager'+winExt), ['update'], {
		stdio: 'inherit'
	}).once('close', cb);
};

var webdriver_standalone = function(cb) {
	var child = child_process.spawn(path.resolve(getProtractorDir() + '/webdriver-manager'+winExt), ['start'], {
		stdio: 'inherit'
	}).once('close', cb);
};

module.exports = {
	protractor: protractor,
	webdriver_standalone: webdriver_standalone,
	webdriver_update: webdriver_update
};
