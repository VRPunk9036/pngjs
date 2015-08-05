
var fs = require('fs'),
    PNG = require('../lib/png').PNG;

module.exports = function(done) {

    fs.readdir(__dirname + '/in/', function (err, files) {
        if (err) throw err;

        files = files.filter(function(file) {
            return ((process.argv[2] || "").indexOf("nolarge") < 0 || !file.match(/large/i)) && Boolean(file.match(/\.png$/i));
        });

        console.log("Converting images");

        var completed = 0;
        var expected = files.length * 2;
        var anyFailures = false;
        function complete(isSuccessful) {
            completed++;
            anyFailures = anyFailures || !isSuccessful;
            if (expected === completed) {
                if (anyFailures) {
                    process.exit(1);
                    return;
                }
                done();
            }
        }

        files.forEach(function (file) {

            //console.log(file);
            var expectedError = false;
            if (file.match(/^x/)) {
                expectedError = true;
            }

            var syncError = false;
            var data = fs.readFileSync(__dirname + '/in/' + file);
            try {
                var png = PNG.sync.read(data);
            } catch (e) {
                if (!expectedError) {
                    console.log("Sync: Unexpected error parsing.." + file);
                    console.log(e);
                    console.log(e.stack);
                }
                syncError = true;
                complete(expectedError);
            }

            if (!syncError) {
                if (expectedError) {
                    console.log("Sync: Error expected, parsed fine ..", file);
                    complete(false);
                } else {

                    var outpng = new PNG();
                    outpng.gamma = png.gamma;
                    outpng.data = png.data;
                    outpng.width = png.width;
                    outpng.height = png.height;
                    outpng.pack()
                      .pipe(fs.createWriteStream(__dirname + '/outsync/' + file)
                        .on("finish", function () {
                            complete(true);
                        }));
                }
            }

            fs.createReadStream(__dirname + '/in/' + file)
              .pipe(new PNG())
              .on('error', function (err) {
                  if (!expectedError) {
                      console.log("Async: Unexpected error parsing.." + file, err);
                  }
                  complete(expectedError);
              })
              .on('parsed', function () {

                  if (expectedError) {
                      console.log("Async: Error expected, parsed fine ..", file);
                  }

                  this.pack()
                  .pipe(
                    fs.createWriteStream(__dirname + '/out/' + file)
                      .on("finish", function() {
                          complete(true);
                      }));
              });
        });
    });
}
