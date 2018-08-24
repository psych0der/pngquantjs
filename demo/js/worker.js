(function() {

    /* Import pngquant.js synchronously */
    importScripts('pngquant.min.js');

    /* function to pass progess update */
    function print(text) {
        postMessage({'type': 'stdout', 'data': text});
    }

    /* bind on message event handler */
    onmessage = function(event) {
        var message = event.data;
        if (message.type === "command") {
            var args = message.arguments;

            postMessage({
                'type': 'start',
                'data': JSON.stringify(args)
            });

            print('Received command: ' + JSON.stringify(args));

            var time = performance.now();
            var result = pngquant(message.file.data, args, print);
            var totalTime = (performance.now() - time).toFixed(3);

            print('Finished processing (took ' + totalTime + 'ms)');


            postMessage({'type': 'done', 'data': [result], 'time': totalTime});
        }
    };
    postMessage({'type': 'ready'});
})();
