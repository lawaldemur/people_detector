// start node server
const express = require('express')
var bodyParser = require('body-parser')
var fs = require("fs")
var Jimp = require('jimp')

const app = express()
app.use(express.static('src'));
app.use(bodyParser.urlencoded({
	limit: '50mb',
	extended: false
}))
app.use(bodyParser.json({limit: "5mb"}))

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html')
})

app.post('/', (req, res, next) => {
	var base64Data = req.body.img.replace(/^data:image\/png;base64,/, "")
	fs.writeFile('images/' + req.body.name + '.png', base64Data, 'base64', function(err) {
		if (err)
			console.log(err)
	})

	Jimp.read('images/' + req.body.name + '.png')
	.then(image => {
		image
		.crop(req.body.left, req.body.top, Math.max(req.body.width, req.body.height), Math.max(req.body.width, req.body.height))
		// .crop(req.body.left, req.body.top, req.body.width, req.body.height)
		.write('dist/' + req.body.name + '.png')
	})
	.catch(err => {
		console.log(err)
	})

	res.send('success');
	next()	
})

app.listen(3000)

