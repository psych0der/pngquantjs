(function() {

    /* Import pngquant.js synchronously */
    importScripts('pngquant.js');

    /* storing initial date*/
    var now = Date.now;

    /* function to pass progess update */
    function print(text) {
        postMessage({'type': 'stdout', 'data': text});
    }

    /* bind on message event handler */
    onmessage = function(event) {
        var message = event.data;
        if (message.type === "command") {
            var Module = {
                print: print,
                printErr: print,
                files: message.files || [],
                arguments: message.arguments || []
            };

            postMessage({
                'type': 'start',
                'data': JSON.stringify(Module.arguments)
            });

            print('Received command: ' + JSON.stringify(Module.arguments));

            var time = now();
            var result = pngquant(message.file.data, message.arguments, print);
            var totalTime = now() - time;

            print('Finished processing (took ' + totalTime + 'ms)');


            postMessage({'type': 'done', 'data': [result], 'time': totalTime});
        }
    };
    postMessage({'type': 'ready'});
})();
