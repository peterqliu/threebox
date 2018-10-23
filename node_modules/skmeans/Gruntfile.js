module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt);

	// Project configuration.
	grunt.initConfig({
	  pkg: grunt.file.readJSON('package.json'),
		browserify: {
			dist: {
				watch: true,
				keepAlive: true,
				files: {
					'dist/browser/skmeans.js': ['browser.js']
				}
			}
		},
		babel: {
			options: {
				sourceMap: true,
				presets: ['es2015']
			},
			dist: {
				files: [
					{
						expand: true,
						src: ['*.js'],
						dest: 'dist/node',
						ext: '.js'
					},
					{
						'dist/browser/skmeans.js': ['dist/browser/skmeans.js'],
					}
				]
			}
		},
	  uglify: {
	    options: {
	      banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
	    },
			dist : {
				files: {
					'dist/browser/skmeans.min.js' : ['dist/browser/skmeans.js']
				}
			}
	  },
		clean: ['dist/browser/*.js','dist/browser/*.map']
	});

	grunt.registerTask('default', ['browserify','babel','uglify']);
};
