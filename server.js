require('dotenv').config()

const express = require('express');
const app = express();
const port = process.env.PORT ? process.env.PORT : 3000;
const path = require('path')
const fs = require("promise-fs");
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser')
const rimraf = require('rimraf')
const validator = require('validator')
let Queue = require('bull');
let imgQueue = new Queue('image');
let deleteQueue = new Queue('delete')
let history = require('connect-history-api-fallback');
let compression = require('compression')
const cluster = require('cluster')
const clusterWorkerSize = require('os').cpus().length
const CronJob = require('cron').CronJob

const methods = require('./server/methods.js');

app.use(express.static('dist'));
app.use('/min', express.static('./min'));
app.use(fileUpload({
	limits: {
		fileSize: 20 * 1024 * 1024
	}
}));

app.use(compression())

cluster.on('exit', function(worker) {
	cluster.fork()
})

// if we're in development mode, when the server restarts empty out the tmp and min directories
// if (process.env.NODE_ENV === 'development') {
if (false) {
	fs.readdir(`./min`, (err, files) => {
		if (err) {
			return handleError(err);
		}

		methods.emptyDirectory(`./min/`, files)
	})

	fs.readdir(`./tmp`, (err, files) => {
		if (err) {
			return methods.handleError(err)
		}

		methods.emptyDirectory(`./tmp/`, files)
	})
}

// initial setup in which we make sure necessary folders are where they should be
// test if logs folder exists
fs.stat(`./server/logs`, (err, stats) => {
	// if not, create it
	if (err) {
		fs.mkdirSync('./server/logs')
	}
})

// test if error log file exists
fs.stat(`./server/logs/err.log`, (err, stats) => {
	// if not, create it
	// or if the error log is greater than 10kb, overwrite it
	if (err) {
		fs.appendFileSync(`./server/logs/err.log`, '')
	} else if (stats.size > 10000) {
		fs.writeFileSync(`./server/logs/err.log`, '')
	}
})

fs.stat(`./server/logs/process.log`, (err, stats) => {
	// because the process log is a step by step account of all of the processes, we're setting this log file to a max of 50kb to make sure we can go back far enough for it to be useful
	if (err) {
		fs.appendFileSync(`./server/logs/process.log`, '')
	} else if (stats.size > 50000) {
		fs.writeFileSync(`./server/logs/process.log`, '')
	}
})

// test if temporary file directory exists
fs.stat(`./tmp`, (err, stats) => {
	// if not, create it
	if (err) {
		fs.mkdirSync(`./tmp`)
	}
})

// test if minified output directory exists
fs.stat(`./min`, (err, stats) => {
	// if not, create it
	if (err) {
		fs.mkdirSync(`./min`)
	}
})

function routes(app) {

	app.get('/test/:id', (req, res) => {
		let id = req.params.id;

		let dir;
		let zip;

		try {
			dir = fs.statSync(`./min/${id}`);
		} catch {
			return res.status(404).send('The file you requested could not be found. It may have expired, or you may need to check your URL.')
		}

		try {
			zip = fs.statSync(`./min/${id}.zip`);
		} catch {
			return res.status(202).send('Still processing.')
		}

		if (!dir && !zip) {
			return res.status(500).send('There was an error retrieving your files.')
		}

		fs.stat(`./min/${id}.zip`, (err, stats) => {
			if (err) {
				return res.status(500).send('There was an error retrieving your files.')
			}

			let created = stats.birthtimeMs;

			methods.collectFiles(id)
				.then((files) => {
					let data = {
						files: files,
						created: created
					}

					res.status(200).send(data)
				})
				.catch((err) => {
					methods.handleError(err, 'app.get() > fs.stat(./min/id.zip) > methods.collectFiles(...) > catch()')
				})
		})

	})

	app.get(`/download/:id/zip`, (req, res) => {
		let id = req.params.id

		if (!fs.existsSync(`./min/${id}`)) {
			let errorData = {
				statusCode: 404,
				message: 'The file you requested has expired. Please re-upload your images and try again.'
			}

			return res.status(404).renderVue('404.vue', errorData)
		}

		res.download(`${__dirname}/min/${id}.zip`)
	})

	app.get(`/download/:id`, (req, res) => res.sendFile(`${__dirname}/index.html`))

	app.get(`/min/:id/:img`, (req, res) => {
		let id = req.params.id;
		let img = req.params.img;

		fs.stat(`./min/${id}/${img}`, (err, stats) => {
			if (err) {
				res.status(404).send('The image you requested could not be found.')
			}
		})
	})

	app.delete(`/:id`, (req, res) => {
		let id = req.params.id;

		methods.deleteImage(id)
			.then((id) => {
				res.status(200).send(id)
			})
			.catch((err) => {
				console.log(err)
				res.status(500).send(err)
			})
	});

	app.get('/', (req, res) => {
		console.log('test ' + process.pid)
		res.sendFile(`${__dirname}/index.html`);
	})

	// any routes that aren't explicitly called out just get redirected to the home page
	app.get('/*', (req, res) => {
		let reqPath = req.originalUrl.split('/')[1]
		if (reqPath !== 'min') {
			res.redirect('/')
		}
	});

	app.post('/upload', (req, res) => {

		let id = methods.genId();
		let img = req.files.image;
		let sizes = req.body && req.body.sizes ? req.body.sizes : [];

		if (!img) {
			// throwing 400 because if there's no image it means the user did not include an image. this should never come up, but better to have it
			return res.status(400);
		}

		// if there's only one size selected it is a string and not an array, so quickly convert it to array so as not to break the foreach loop in "resizeImage" in methods
		typeof sizes == 'string' ? sizes = [sizes] : sizes = sizes

		let ext = path.extname(img.name)
		let name = req.body.outputName ? validator.blacklist(req.body.outputName, './') : req.files.image.name.split('.')[0]

		let imgData = {
			id: id,
			file: img.name,
			// user may not want sizes and may just want the optimized image. if no sizes, just make imgData.sizes an empty array
			sizes: sizes ? sizes : [],
			tmpDir: `./tmp/${id}`,
			minDir: `./min/${id}`,
			og: `./tmp/${id}/${name}-original${ext}`,
			ext: ext,
			name: name,
			async: req.body.async
		}

		// create the necessary directories
		fs.mkdir(imgData.tmpDir)
			.then(fs.mkdir(imgData.minDir))
			.then(img.mv(imgData.og))
			.then(() => {
				console.log('done making folders, processing now')
				imgQueue.add(imgData)
			})
			.catch((err) => {
				console.log('error making the directory ' + err)
			})
		// this is the call stack for image processing
		// each method returns a promise and passes along the imgData object (making minor changes along the way)

		res.send(imgData)
	})
}

if (cluster.isMaster) {
	methods.logProcess(`STARTUP: Master ${process.pid} is running`)
	for (let i = 0; i < clusterWorkerSize; i += 1) {
		cluster.fork()
	}

	let i = 0;
	let workers = [];

	cluster.on('online', (worker, code, signal) => {
		methods.logProcess('worker ' + worker.process.pid + ' starting')
	})

	let deleteExpired = new CronJob('0 */1 * * * *', deleteQueue.add())

	deleteExpired.start();

	cluster.on('exit', function(worker, code, signal) {
		methods.logProcess('worker ' + worker.process.pid + ' died');
		cluster.fork()
	});

} else {
	imgQueue.process((job, done) => {
		methods.logProcess(cluster.worker.process.pid + ' processing id: ' + job.data.id)
		methods.validateSizes(job.data)
			.then(methods.resizeImage)
			.then(methods.generateAsyncImage)
			.then(methods.optimizeImage)
			.then(methods.printCode)
			.then(methods.zipDir)
			.then((imgData) => {
				done()
			})
			.catch((err) => {
				methods.handleError(err, 'methods.validateSizes() > catch()')
			})
	})

	deleteQueue.process((job, done) => {
		methods.deleteExpired()
			.then(done())
	})

	routes(app)

	app.listen(port, () => console.log(`Listening at http://localhost:${port}`))
}
