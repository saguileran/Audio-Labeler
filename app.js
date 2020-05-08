/**
 * Create a WaveSurfer instance.
 */
var wavesurfer;

/**
 * Init & load.
 */
document.addEventListener('DOMContentLoaded', function() {
    // Init wavesurfer
    /*
    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        height: 100,
        pixelRatio: 1,
        scrollParent: true,
        normalize: true,
        minimap: true,
        backend: 'MediaElement',
        plugins: [
            WaveSurfer.regions.create(),
            WaveSurfer.minimap.create({
                height: 30,
                waveColor: '#ddd',
                progressColor: '#999',
                cursorColor: '#999'
            }),
            WaveSurfer.timeline.create({
                container: '#wave-timeline'
            })
        ]
    });
    */


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
            container: '#wave-spectrogram',
//	    colorMap: colorMap,
	    labels: true
        },
        cursor: {
	showTime: true,
            opacity: 1,
            customShowTimeStyle: {
                'background-color': '#000',
                color: '#fff',
                padding: '1px',
                'font-size': '10px'
            }
	},
        regions: {},
    };
    var options = {
        container: '#waveform',
        height: 150,
	normalize: true,
        waveColor: 'gray',
        progressColor: 'green',
        loaderColor: 'green',
        cursorColor: 'navy',
        minimap: true,
        backend: 'MediaElement',
        plugins: [WaveSurfer.timeline.create(pluginOptions.timeline), WaveSurfer.regions.create(pluginOptions.regions), WaveSurfer.cursor.create(pluginOptions.cursor)]
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
		plugin = WaveSurfer[pluginName].create(options);
                if (activate) {
                    wavesurfer.addPlugin(plugin).initPlugin(pluginName);
                } else {
                    wavesurfer.destroyPlugin(pluginName);
                };
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

/*
    wavesurfer.util
        .fetchFile({
            responseType: 'json',
            url: 'rashomon.json'
        })
        .on('success', function(data) {
            wavesurfer.load(
                //'http://www.archive.org/download/mshortworks_001_1202_librivox/msw001_03_rashomon_akutagawa_mt_64kb.mp3',
                'Audios/Theme.mp3',
                data
            );
        });
*/
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


    // The playlist links
    var links = document.querySelectorAll('#playlist a');
    var currentTrack = 0;

    // Load a track by index and highlight the corresponding link
    var setCurrentSong = function(index) {
        links[currentTrack].classList.remove('active');
        currentTrack = index;
        links[currentTrack].classList.add('active');
        wavesurfer.load(links[currentTrack].href);
    };

    // Load the track on click
    Array.prototype.forEach.call(links, function(link, index) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            setCurrentSong(index);
        });
    });

    // Play on audio load
    wavesurfer.on('ready', function() {
        wavesurfer.play();
    });

    wavesurfer.on('error', function(e) {
        console.warn(e);
    });

    // Go to the next track on finish
    wavesurfer.on('finish', function() {
        setCurrentSong((currentTrack + 1) % links.length);
    });

    // Load the first track
    setCurrentSong(currentTrack);



});

/**
 * Save annotations to localStorage.
 */
function saveRegions() {
    localStorage.regions = JSON.stringify(
        Object.keys(wavesurfer.regions.list).map(function(id) {
            var region = wavesurfer.regions.list[id];
            return {
                start: region.start,
                end: region.end,
                attributes: region.attributes,
                data: region.data
            };
        })
    );


    // Load a colormap json file to be passed to the spectrogram.create method.

}

/**
 * Load regions from localStorage.
 */
function loadRegions(regions) {
    regions.forEach(function(region) {
        region.color = randomColor(0.1);
        wavesurfer.addRegion(region);
    });
}

/*
 * Random RGBA color.
 */
function randomColor(alpha) {
    return (
        'rgba(' +
        [
            ~~(Math.random() * 255),
            ~~(Math.random() * 255),
            ~~(Math.random() * 255),
            alpha || 1
        ] +
        ')'
    );
}

/**
 * Edit annotation for a region.
 */
function editAnnotation(region) {
    var form = document.forms.edit;
    form.style.opacity = 1;
    (form.elements.start.value = Math.round(region.start * 10) / 10),
        (form.elements.end.value = Math.round(region.end * 10) / 10);
    form.elements.note.value = region.data.note || '';
    form.onsubmit = function(e) {
        e.preventDefault();
        region.update({
            start: form.elements.start.value,
            end: form.elements.end.value,
            data: {
                note: form.elements.note.value
            }
        });
        form.style.opacity = 0;
    };
    form.onreset = function() {
        form.style.opacity = 0;
        form.dataset.region = null;
    };
    form.dataset.region = region.id;
}

/**
 * Display annotation.
 */
function showNote(region) {
    if (!showNote.el) {
        showNote.el = document.querySelector('#subtitle');
    }
    showNote.el.textContent = region.data.note || '–';
}

/**
 * Bind controls.
 */
window.GLOBAL_ACTIONS['delete-region'] = function() {
    var form = document.forms.edit;
    var regionId = form.dataset.region;
    if (regionId) {
        wavesurfer.regions.list[regionId].remove();
        form.reset();
    }
};

window.GLOBAL_ACTIONS['export'] = function() {
    window.open(
        'data:application/json;charset=utf-8,' +
            encodeURIComponent(localStorage.regions)
    );
};


