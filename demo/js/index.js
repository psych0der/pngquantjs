(function() {
    var worker;
    var sampleImageData;
    var outputElement;
    var filesElement;
    var running = false;
    var isWorkerLoaded = false;
    var outputElement = null;

    /* Using query selector */
    window.$ = document.querySelector.bind(document);

    var inputImageData = null, // reference to input image data
        outputImagedata = null;

    /* Utility to convert file size in readable format */
    function readableFileSize(bytes, si) {;
        var thresh = si
            ? 1000
            : 1024;
        if (Math.abs(bytes) < thresh) {
            return bytes + ' B';
        }
        var units = si
            ? [
                'kB',
                'MB',
                'GB',
                'TB',
                'PB',
                'EB',
                'ZB',
                'YB'
            ]
            : [
                'KiB',
                'MiB',
                'GiB',
                'TiB',
                'PiB',
                'EiB',
                'ZiB',
                'YiB'
            ];
        var u = -1;
        do {
            bytes /= thresh;
            ++u;
        } while (Math.abs(bytes) >= thresh && u < units.length - 1);
        return bytes.toFixed(1) + ' ' + units[u];
    }

    /* Utility to convert data url to blob */
    function dataURLtoUint8(dataurl) {
        var arr = dataurl.split(','),
            mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]),
            n = bstr.length,
            u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return u8arr;
    }

    var getImgWithColorPreset=(dataURL,callback)=>{
        //console.log(dataURL);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) callback(dataURL);
        const img = new Image();
        img.onload=()=>{
            const width = img.naturalWidth;
            const height = img.naturalHeight;
            canvas.width = width;
            canvas.height = height;
            context.drawImage(img, 0, 0);
            //console.log(width,height,canvas.toDataURL('image/png'));
            callback(canvas.toDataURL('image/png'));
        }
        img.src = dataURL;
    }

    /* event handler for image picker */
    var readURL = function(file) {
        var dataUrlReader = new FileReader();
        dataUrlReader.onload = function(e) {
            $('#input-img').setAttribute('src', e.target.result);
            $('#input-file-stats').innerHTML = 'Input image [' + readableFileSize(file.size) + ']';
            $('#terminal').style.display = 'block';
            $('#file-dropper').style.display = 'none';
            getImgWithColorPreset(e.target.result,(data)=>{
                inputImageData = dataURLtoUint8(data);
            })
        }
        dataUrlReader.readAsDataURL(file);
    }

    function getRangeSliderValue() {
        // Get slider values
        var parent = $(".range-slider");
        var slides = parent.getElementsByTagName("input");
        var slide1 = parseFloat(slides[0].value);
        var slide2 = parseFloat(slides[1].value);
        // Neither slider will clip the other, so make sure we determine which is larger
        if (slide1 > slide2) {
            var tmp = slide2;
            slide2 = slide1;
            slide1 = tmp;
        }

        var displayElement = $(".range-values");
        displayElement.innerHTML = slide1 + " - " + slide2;
        return slide1 + "-" + slide2;;
    }

    function getSliderValue() {
        var slider = $('#speed-control');
        $('.speed-value').innerHTML = slider.value;
        return slider.value;
    }

    /* Run the compression function */
    function runIt(args) {
        worker.postMessage({
            type: "command",
            arguments: args,
            file: {
                "name": "input.png",
                "data": inputImageData
            }
        });
    }

    /* Prepare downoad link form blob */
    function getDownloadLink(fileData, fileName) {
        if (fileName.match(/\.jpeg|\.gif|\.jpg|\.png/)) {
            var blob = new Blob([fileData]);
            var src = window.URL.createObjectURL(blob);
            return src;
        }
    }

    /* Initialize worker script and bind event handlers */
    function initWorker() {
        worker = new Worker("js/worker.js");
        worker.onmessage = function(event) {
            var message = event.data;
            if (message.type == "ready") {
                $('.loading').style.display = 'none';
                $('.loaded').style.display = 'block';
                /* removing disabled state from buttons */
                $('#compress').disabled = false;
                $('#reset').disabled = false;

            } else if (message.type == "stdout") {
                outputElement.textContent += message.data + "\n";
            } else if (message.type == "start") {
                outputElement.textContent = "Worker has received command\n";
            } else if (message.type == "done") {
                var buffers = message.data;
                if (buffers && buffers.length) {
                    outputElement.className = "closed";
                }
                buffers && buffers.forEach(function(file) {
                    $('#output-img').src = getDownloadLink(file.data, 'output.png');
                    $('#output-file-stats').innerHTML = 'Output image [' + readableFileSize(file.data.byteLength) + ']';
                    $('.output-preview').style.display = 'block';
                    $('.compress-text').style.display = 'none';
                    $('.refresh-container').style.display = 'block';
                });
            }
        };
    }

    document.addEventListener("DOMContentLoaded", function() {
        outputElement = $("#output");
        initWorker();
        $('#filePicker').onchange = function(e) {
            if (this.files && this.files[0]) {
                if (!this.files[0].name.match(/.(png)$/i)) {
                    alert('not a valid PNG image');
                    return;
                }
                readURL(this.files[0]);
            }
        }

        $('#file-dropper').ondragover = function() {
            this.className = 'hover';
            return false;
        };
        $('#file-dropper').ondragend = function() {
            this.className = '';
            return false;
        };
        $('#file-dropper').ondrop = function(e) {
            this.className = '';
            e.preventDefault();

            var file = e.dataTransfer.files[0];
            readURL(file);
        };

        /* init range slider */
        var sliderSections = $(".range-slider");
        if (!(Array.isArray(sliderSections))) {
            sliderSections = [sliderSections];
        }
        /* attach get function to all sliders */
        for (var x = 0; x < sliderSections.length; x++) {
            var sliders = sliderSections[x].getElementsByTagName("input");
            for (var y = 0; y < sliders.length; y++) {
                if (sliders[y].type === "range") {
                    sliders[y].oninput = getRangeSliderValue;
                    // Manually trigger event first time to display values
                    sliders[y].oninput();
                }
            }
        }

        /* initiazling speed control */
        $('#speed-control').oninput = getSliderValue;
        $('#speed-control').oninput();

        /* run the compress function */
        $('#compress').onclick = function(e) {
            e.preventDefault();
            $('#console').style.display = 'block';
            $('.compress-text').style.display = 'block';
            $('#control-panel').style.display = 'none';
            runIt({
                'quality': getRangeSliderValue(),
                'speed': '' + getSliderValue()
            });
        }

        $('#reset').onclick = function(e) {
            e.preventDefault();
            $('#input-img').setAttribute('src', '');
            $('#input-file-stats').innerHTML = '';
            $('#terminal').style.display = 'none';
            $('#file-dropper').style.display = 'block';
            inputImageData = null;
        }

        /* refresh entire state */
        $('#refresh').onclick = function(e) {
          e.preventDefault();
          $('#output-img').src = '';
          $('#output-file-stats').innerHTML = '';
          $('.output-preview').style.display = 'none';
          $('#output').innerHTML = '';
          $('#console').style.display = 'none';
          $('#input-img').setAttribute('src', '');
          $('#input-file-stats').innerHTML = '';
          $('#terminal').style.display = 'none';
          $('#file-dropper').style.display = 'block';
          $('.refresh-container').style.display = 'none';
          $('#control-panel').style.display = 'block';
          inputImageData = null;

        }

    });

})();
