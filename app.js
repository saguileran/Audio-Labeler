'use strict';

//import CursorCustomPlugin from './Wavesurfer/CursorCustomPlugin.js';

var wavesurfer;

// Init & load
document.addEventListener('DOMContentLoaded', function() {
    var pluginOptions = {
        minimap: {
            waveColor: '#777',
            progressColor: '#222',
            height: 30
        },
        timeline: {
            container: '#wave-timeline'
        },
        spectrogram: {
            container: '#wave-spectrogram'
        },
        cursor: {
	    showTime: true,
            opacity: 1,
            customShowTimeStyle: {
                'background-color': '#000',
                color: '#fff',
                padding: '2px',
                'font-size': '10px'
	    },
	},
        regions: {
            regions: [
                {
                    start: 1,
                    end: 3,
                    color: 'hsla(400, 100%, 30%, 0.5)'
                },
                {
                    start: 4,
                    end: 5.4
                },
                {
                    start: 6.22,
                    end: 7.1
                }
            ]
        },
        elan: {
            url: '../elan/transcripts/001z.xml',
            container: '#annotations',
            tiers: {
                Text: true,
                Comments: true
            }
        }
    };
    var options = {
        container: '#waveform',
        waveColor: 'violet',
        progressColor: 'purple',
        loaderColor: 'purple',
        cursorColor: 'navy',
        plugins: [WaveSurfer.timeline.create(pluginOptions.timeline)]
    };

    if (location.search.match('scroll')) {
        options.minPxPerSec = 100;
        options.scrollParent = true;
    }

    if (location.search.match('normalize')) {
        options.normalize = true;
    }

    // Init wavesurfer
    wavesurfer = WaveSurfer.create(options);

    [].forEach.call(
        document.querySelectorAll('[data-activate-plugin]'),
        function(el) {
            var activePlugins = wavesurfer.initialisedPluginList;
            Object.keys(activePlugins).forEach(function(name) {
                if (el.dataset.activatePlugin === name) {
                    el.checked = true;
                }
            });
        }
    );

    [].forEach.call(
        document.querySelectorAll('[data-activate-plugin]'),
        function(el) {
            el.addEventListener('change', function(e) {
                var pluginName = e.currentTarget.dataset.activatePlugin;
                var activate = e.target.checked;
                var options = pluginOptions[pluginName] || {};
                var plugin;
                if (pluginName === 'cursorCustom') {
                    plugin = CursorCustomPlugin.create(options);
                } else {
                    plugin = WaveSurfer[pluginName].create(options);
                }
                if (activate) {
                    wavesurfer.addPlugin(plugin).initPlugin(pluginName);
                } else {
                    wavesurfer.destroyPlugin(pluginName);
                }
            });
        }
    );

    /* Progress bar */
    (function() {
        var progressDiv = document.querySelector('#progress-bar');
        var progressBar = progressDiv.querySelector('.progress-bar');

        var showProgress = function(percent) {
            progressDiv.style.display = 'block';
            progressBar.style.width = percent + '%';
        };

        var hideProgress = function() {
            progressDiv.style.display = 'none';
        };

        wavesurfer.on('loading', showProgress);
        wavesurfer.on('ready', hideProgress);
        wavesurfer.on('destroy', hideProgress);
        wavesurfer.on('error', hideProgress);
    })();

    //wavesurfer.load("Audios/Who's Theme.mp3");
    wavesurfer.load("Audios/PLG07_20190712_013000.WAV");

    // controls
    document
        .querySelector('[data-action="play"]')
        .addEventListener('click', wavesurfer.playPause.bind(wavesurfer));


    /* Regions */

    wavesurfer.on('ready', function() {
        wavesurfer.enableDragSelection({
            color: randomColor(0.1)
        });

        if (localStorage.regions) {
            loadRegions(JSON.parse(localStorage.regions));
        } else {
            // loadRegions(
            //     extractRegions(
            //         wavesurfer.backend.getPeaks(512),
            //         wavesurfer.getDuration()
            //     )
            // );
            wavesurfer.util
                .ajax({
                    responseType: 'json',
                    url: 'annotations.json'
                })
                .on('success', function(data) {
                    loadRegions(data);
                    saveRegions();
                });
        }
    });
    wavesurfer.on('region-click', function(region, e) {
        e.stopPropagation();
        // Play on click, loop on shift click
        e.shiftKey ? region.playLoop() : region.play();
    });
    wavesurfer.on('region-click', editAnnotation);
    wavesurfer.on('region-updated', saveRegions);
    wavesurfer.on('region-removed', saveRegions);
    wavesurfer.on('region-in', showNote);

    wavesurfer.on('region-play', function(region) {
        region.once('out', function() {
            wavesurfer.play(region.start);
            wavesurfer.pause();
        });
    });

    /* Toggle play/pause buttons. */
    var playButton = document.querySelector('#play');
    var pauseButton = document.querySelector('#pause');
    wavesurfer.on('play', function() {
        playButton.style.display = 'none';
        pauseButton.style.display = '';
    });
    wavesurfer.on('pause', function() {
        playButton.style.display = '';
        pauseButton.style.display = 'none';
    });

});
