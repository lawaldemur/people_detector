// element selectors
const sourceVideo = document.querySelector('video');
const drawCanvas = document.querySelector('canvas');
// video parametrs
const videoWidth = 1280;
const videoHeight = 720;
// Canvas setup
var img_counter = 0;
// Global flags
const flipHorizontal = false;
let stopPrediction = false;
let isPlaying = false,
    gotMetadata = false;
let firstRun = true;
// save face images
const saveFaceImages = false;


// start
document.querySelector('#main').addEventListener('click', e => {
    if (isPlaying) {
        sourceVideo.pause();
        isPlaying = false;
        console.log('video paused');
    } else {
        if (gotMetadata)
            load()
    }
});

// check if metadata is ready - we need the sourceVideo size
sourceVideo.onloadedmetadata = () => {
    console.log("video metadata ready");
    gotMetadata = true;
    if (isPlaying)
        load()
};

// Check if the sourceVideo has started playing
sourceVideo.onplaying = () => {
    console.log("video playing");
    isPlaying = true;
    if (gotMetadata)
        load()
};

function load(multiplier=1, stride=16) {
    sourceVideo.width = videoWidth;
    sourceVideo.height = videoHeight;

    // Canvas results for displaying masks
    drawCanvas.width = videoWidth;
    drawCanvas.height = videoHeight;

    bodyPix.load({
            multiplier: multiplier,
            stride: stride,
            quantBytes: 4
        })
        .then(net => predictLoop(net))
        .catch(err => console.error(err));
}

async function predictLoop(net) {
    sourceVideo.play();
    isPlaying = true;

    stopPrediction = false;
    drawCanvas.style.display = "block";

    while (isPlaying && !stopPrediction) {
        // BodyPix setup
        const segmentPersonConfig = {
            maxDetections: 10,                   // only look at one person in this model
            scoreThreshold: 0.4,
            segmentationThreshold: 0.7,         // default is 0.7
        };
        const segmentation = await net.segmentMultiPersonParts(sourceVideo, segmentPersonConfig);
        console.log(segmentation);

        // skip if noting is there
        if (segmentation.length <= 0) {
            // console.info("No segmentation data");
            continue;
        }

        // Draw faceborder to canvas
        draw(segmentation);   
    }

}

// Use the bodyPix draw API's
function draw(personSegmentation) {
    let targetSegmentation = personSegmentation;

    // Just show the face
    for (var i = 0; i < personSegmentation.length; i++) {
        targetSegmentation[i].data = personSegmentation[i].data.map(val => {
            if (val !== 0 && val !== 1)
                return -1;
            else
                return val;
        });
    }

    const coloredPartImage = bodyPix.toColoredPartMask(targetSegmentation);
    const opacity = 0.7;
    const maskBlurAmount = 0;
    bodyPix.drawMask(
        drawCanvas, sourceVideo, coloredPartImage, opacity, maskBlurAmount,
        flipHorizontal);


    // save face to server folder
    if (saveFaceImages)
        saveFaceSquare(targetSegmentation);
}


function saveFaceSquare(targetSegmentation) {
    img_counter++;

    // save only each tenth frame
    if (img_counter % 10 > 0)
        return;

    pixels = targetSegmentation.data;

    var left_x = -1,
        right_x = videoWidth,
        top_y = videoHeight,
        bottom_y = -1;

    for (var y = 0; y < videoHeight; y++) {
        for (var x = 0; x < videoWidth; x++) {
            val = pixels[x + y * videoWidth];

            // nothing found
            if (val != 0 && val != 1)
                continue

            // left border
            if (left_x < x)
                left_x = x
            // right border
            if (right_x > x)
                right_x = x
            // top border (first face pixel is top pixel)
            if (top_y > y)
                top_y = y
            // bottom border
            if (bottom_y < y)
                bottom_y = y
        }
    }

    $.ajax({
        url: '/',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({
            name: img_counter.toString() + '_' + Date.now().toString(),
            img: drawCanvas.toDataURL(),
            top: top_y,
            left: 640 - left_x,
            height: bottom_y - top_y,
            width: (640 - right_x) - (640 - left_x)
        }),
    });
}