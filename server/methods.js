const imagemin = require('imagemin')
// const imageminJpegRecompress = require('imagemin-jpeg-recompress')
const imageminMozJpeg = require('imagemin-mozjpeg')
const imageminPngquant = require('imagemin-pngquant')
const imageminGifsicle = require('imagemin-gifsicle')
const imageminSvgo = require('imagemin-svgo')
const path = require('path')
const Jimp = require('jimp')
const fs = require('fs')
const triangulate = require('triangulate-image')
const rimraf = require('rimraf')
const AdmZip = require('adm-zip')

let sizeOptions = {
	'xsmall': 320,
	'small': 480,
	'medium': 960,
	'large': 1280,
	'retina': 2560
}

function blur(imgData) {
	// Jimp.read is a promise so we do not need to wrap it in a promise
	return Jimp.read(imgData.og)
		.then((img) => {
			logProcess('blurring ' + imgData.id + 'name ' + imgData.og)
			let clone = img.clone();

			clone.scale(2)
				.quality(70)
				.blur(20)
				.resize(960, Jimp.AUTO)
				.write(`${imgData.tmpDir}/${imgData.name}-async${imgData.ext}`);
		})
		.catch((err) => {
			handleError(err, 'blur() > Jimp.read() > catch()')
		})
}

function pixellate(imgData) {
	return Jimp.read(imgData.og)
		.then((img) => {
			logProcess('pixellating ' + imgData.id + 'name ' + imgData.og)
			let clone = img.clone();

			clone.scale(2)
				.quality(70)
				.pixelate(160)
				.resize(960, Jimp.AUTO)
				.write(`${imgData.tmpDir}/${imgData.name}-async${imgData.ext}`)
		})
		.catch((err) => {
			handleError(err, 'pixellate() > Jimp.read() > catch()')
		})
}

function tessellate(imgData) {
	return Jimp.read(imgData.og)
		.then((img) => {
			logProcess('tessellating ' + imgData.id + 'name ' + imgData.og)
			let clone = img.clone();

			img.resize(960, Jimp.AUTO)

			img.getBuffer(img.getMIME(), (err, buffer) => {
				if (err) {
					return handleError(err, 'tesellate() > img.getBuffer() > if (err)')
				}

				let output = `${imgData.tmpDir}/${imgData.name}-async${imgData.ext}`
				let fileStream = fs.createWriteStream(output)
				// params. randomly generates accuracy and vertex count to ensure no two tessellations are the same
				let triangulationParams = {
					accuracy: Math.round(Math.random() * 25) / 100,
					stroke: true,
					strokeWidth: 1,
					blur: 70,
					vertexCount: Math.ceil(Math.random() * 80) + 50
				}

				let jpgStream = triangulate(triangulationParams)
					.fromBufferSync(buffer)
					.toJPGStream({
						quality: 1,
					})

				jpgStream.on('data', function(chunk) { fileStream.write(chunk) })
				jpgStream.on('end', function() {
					fileStream.end()
				})
			})
		})
		.catch((err) => {
			handleError(err, 'tessellate() > Jimp.read(...) > catch()')
		})
}

// function writeLog(log, data) {

// }

function calculateFileSize(sizeInBytes) {
	let size
	if (sizeInBytes < 1000000) {
		let kb = Math.round(sizeInBytes / 1000)
		size = `${kb}kb`
	} else if (sizeInBytes >= 1000000) {
		let mb = Math.round((sizeInBytes / 1000000) * 10) / 10
		size = `${mb}mb`
	} else if (sizeInBytes >= 1000000000) {
		let gb = Math.round((sizeInBytes / 1000000000) * 10) / 10
		size = `${gb}gb`
	}
	return size
}

// begin exported functions

function handleError(err, loc = null) {
	let date = Date(Date.now()).toString()
	let error = ''
	error += '<------------------------------>\r\n'
	error += date + '\r\n'
	error += err + '\r\n'
	error += loc + `\r\n`

	fs.stat(`./server/logs/err.log`, (err, stats) => {
		// if there is an error here, it most likely means it couldn't find the file, which means it doesn't exist, so we create it and then call the function again
		if (err) {
			fs.mkdirSync(`./server/logs/err.log`);
			handleError(err, 'handleError() > fs.stat(...) > if (err)');
		}

		// if the file is greater than 10kb, overwrite it
		if (stats.size > 10000) {
			fs.writeFile(`./server/logs/err.log`, error, (err) => {
				if (err) { handleError(err, 'handleError > if (stats.size > 10000) > fs.writeFile(...)'); }
			})
		} else {
			fs.appendFile('./server/logs/err.log', error, (err) => {
				if (err) { handleError(err, 'handleError > if (stats.size > 10000) > fs.writeFile(...)'); }
			})
		}
	})
}

function genId() {
	return [...Array(10)].map(i => (~~(Math.random() * 36)).toString(36)).join('')
}

// test the original image width against the requested sizes. any sizes that are larger than the original image are removed from the 'sizes' array so we don't have to test later
function validateSizes(imgData) {
	if (imgData.ext == '.svg' || imgData.ext == '.gif') {
		return new Promise((resolve, reject) => {
			resolve(imgData);
		})
	}

	return Jimp.read(imgData.og)
		.then((img) => {
			imgData.width = img.bitmap.width;

			imgData.sizes = imgData.sizes.filter((s) => {
				if (sizeOptions[s] > imgData.width) {
					return false;
				}

				return true
			})

			return imgData;
		})
		.catch((err) => {
			handleError(err, 'validateSizes() > Jimp.read()')
		})
}

function resizeImage(imgData) {
	logProcess('resizing image ' + imgData.id + ' ' + imgData.og)

	if (imgData.ext == '.svg' || imgData.ext == '.gif') {
		return new Promise((resolve, reject) => {
			resolve(imgData);
		})
	}

	return Jimp.read(imgData.og)
		.then((img) => {
			return Promise.all(imgData.sizes.map((s) => {
					let size = sizeOptions[s];
					let clone = img.clone();

					clone.resize(size, Jimp.AUTO)
						.write(`${imgData.tmpDir}/${imgData.name}-${s + imgData.ext}`)
				}))
				.then(() => {
					return imgData;
				})
				.catch((err) => {
					handleError(err, 'resizeImage() > Jimp.read() > Promise.all() > catch()')
				})
		})
		.catch((err) => {
			handleError(err, 'resizeImage() > Jimp.read() > catch()')
		})
}

function generateAsyncImage(imgData) {
	logProcess('generating async image ' + imgData.id + ' ' + imgData.og)

	if (imgData.ext == '.svg' || imgData.ext == '.gif') {
		return new Promise((resolve, reject) => {
			resolve(imgData);
		})
	}

	return new Promise((resolve, reject) => {

		switch (imgData.async) {
			case 'blur':
				blur(imgData)
					.then(() => {
						logProcess('done generating async image, resolving')
						resolve(imgData)
					})
					.catch((err) => {
						handleError(err, `generateAsyncImage() > case 'blur' > blur() > catch`)
					})
				break;
			case 'tri':
				tessellate(imgData)
					.then(() => {
						logProcess('done tessellating, resolving')
						resolve(imgData)
					})
					.catch((err) => {
						handleError(err, `generateAsyncImage() > case 'tri' > tessllate() > catch`)
					})
				break;
			case 'pix':
				pixellate(imgData)
					.then(() => {
						logProcess('done pixellating, resolving')
						resolve(imgData)
					})
					.catch((err) => {
						handleError(err, `generateAsyncImage() > case 'pix' > pixellate() > catch`)
					})
				break;
			default:
				resolve(imgData)
		}
	})
}

function optimizeImage(imgData) {
	logProcess('optimizing image ' + imgData.id + 'name ' + imgData.og);

	return imagemin([imgData.tmpDir], {
			destination: imgData.minDir,
			plugins: [
				imageminMozJpeg({ quality: '90' }),
				imageminPngquant({ quality: [.8, .9], floyd: 1, speed: 1 }),
				imageminGifsicle({ interlaced: true, optimizationLevel: 9, colors: 96 }),
				imageminSvgo()
			]
		})
		.then(() => {
			logProcess('done optimizing, resolving')
			return imgData;
		})
		.catch((err) => {
			handleError(err, 'optimizeImage() > imagemin(...) > catch()')
		})
}

function cleanUp(imgData) {
	return new Promise((resolve, reject) => {
		rimraf(imgData.tmpDir, (err) => {
			if (err) { return handleError(err, 'cleanUp() > rimraf(imgData.tmpDir) > if (err)') }
		})

		rimraf(imgData.minDir, (err) => {
			if (err) { return handleError(err, 'cleanUp() > rimraf(imgData.minDir) > if (err)') }
		})

		resolve(imgData)
	})
}

function zipDir(imgData) {
	logProcess('zipping min directory ' + imgData.id + 'name ' + imgData.og)
	return new Promise((resolve, reject) => {
		let zip = new AdmZip()
		zip.addLocalFolder(imgData.minDir)
		zip.writeZip(`${imgData.minDir}.zip`)
		imgData.zip = `${imgData.minDir}.zip`
		resolve(imgData)
	})
}

// prints out an html snippet with the appropriate markup to use with the async image loading script written concurrently with this project. intentionally left the reject function out of this since it's not necessary. if this fails, user will still get their images.
function printCode(imgData) {
	logProcess('printing code ' + imgData.id + 'name ' + imgData.og)
	return new Promise((resolve, reject) => {
		let sourceSet = ''
		let sizes = '';
		let fileContents = `<!-- code generated based on file uploaded\r\nremember to update source URL and add an alt tag --> \r\n`

		if (imgData.async) {
			fileSource = `${imgData.name}-async${imgData.ext}`
		} else {
			fileSource = `${imgData.name}-original${imgData.ext}`
		}

		fileContents += `<img src="./${fileSource}"`

		for (let i = 0; i < imgData.sizes.length; i++) {
			let s = imgData.sizes[i];
			let w = sizeOptions[s];

			sourceSet += `./${imgData.name}-${s + imgData.ext} ${w}w${i === imgData.sizes.length - 1 ? '' : ', '}`

			sizes += `(max-width: ${w}px) ${w}px${i === imgData.sizes.length - 1 ? '' : ', '}`;
		}

		fileContents += `data-srcset="${sourceSet}"`
		fileContents += `sizes="${sizes}"`
		fileContents += ` />`

		fs.writeFileSync(`${imgData.minDir}/codeExample.html`, fileContents, (err) => {
			if (err) { return handleError(err, 'printCode() > fs.writeFileSync() > if (err)') }
		})

		resolve(imgData)
	}).catch((err) => {
		handleError(err, 'printCode() > catch()')
	})
}

function emptyDirectory(dir, files) {

}

function deleteExpired() {
	return new Promise((resolve, reject) => {
		let now = Date.now();
		let hours = 60 * 60 * 72 * 1000
		let tmpDeleted = 0;
		let minDeleted = 0;

		logProcess(`Deleting expired files.`)

		fs.readdir(`./tmp`, (err, files) => {
			if (err) {
				handleError(err, 'deleteOld() > fs.readdir(./tmp) > if (err)')
				return reject();
			}

			for (file of files) {
				rimraf(`./tmp/${file}`, (err) => {
					if (err) {
						return handleError(err, 'emptyDirectory() > rimraf() > if (err)')
					}

					tmpDeleted++
				})
			}
		})

		fs.readdir(`./min`, (err, files) => {
			if (err) {
				handleError(err, 'deleteOld() > fs.readdir(./min) > if (err)')
				return reject();
			}

			for (file of files) {
				let s = fs.statSync(`./min/${file}`)
				let diff = now - s.birthtimeMs

				if (diff > hours) {
					rimraf(`./min/${file}`, (err) => {
						if (err) {
							return handleError(err, 'deleteOld() > fs.readdir(./tmp) > rimraf(./min/file) > if (err)')
						}

						minDeleted++;
					})
				}
			}
		})

		logProcess(`Expired removal process done. Removed ${tmpDeleted} temp files and ${minDeleted} expired min files.`);

		resolve()
	})
}

function collectFiles(id) {
	return new Promise((resolve, reject) => {
		let data = {
			filename: '',
			zipUrl: `/download/${id}/zip`,
			files: [],
			code: '',
			original: ''
		}

		let files = fs.readdirSync(`./min/${id}`)

		if (files.length < 1) {
			return handleError(err, 'collectFiles() > if (files.length < 1)')
		}

		if (fs.existsSync(`./min/${id}/codeExample.html`)) {
			data.code = fs.readFileSync(`./min/${id}/codeExample.html`, { encoding: 'utf8' });
		}

		for (file of files) {
			if (path.extname(file) !== '.html') {
				let filename = file.split('-');
				let size = filename.pop().split('.')[0]
				let fileSize = calculateFileSize(fs.statSync(`./min/${id}/${file}`).size)

				let imgData = {
					url: `/min/${id}/${file}`,
					fileSize: fileSize,
					size: size
				}

				switch (size) {
					case 'async':
						imgData.width = 960
						break;
					case 'retina':
						imgData.width = 2560
						break;
					case 'large':
						imgData.width = 1280
						break;
					case 'medium':
						imgData.width = 960
						break;
					case 'small':
						imgData.width = 480
						break;
					case 'xsmall':
						imgData.width = 320
						break;
					case 'original':
						imgData.width = 2561
						break;
				}

				data.filename = filename.join('-')

				data.files.push(imgData);
			}
		}

		resolve(data)
	})
}

function logProcess(data) {
	let date = Date(Date.now()).toString()
	let process = ''
	process += '<------------------------------>\r\n'
	process += date + '\r\n'
	process += data + '\r\n'

	fs.stat(`./server/logs/process.log`, (err, stats) => {
		// if there is an error here, it most likely means it couldn't find the file, which means it doesn't exist, so we create it and then call the function again
		if (err) {
			fs.mkdirSync(`./server/logs/process.log`);
			handleError(err, 'logProcess() > fs.stat(...) > if (err)');
		}

		// if the file is greater than 10kb, overwrite it
		if (stats.size > 10000) {
			fs.writeFile(`./server/logs/process.log`, process, (err) => {
				if (err) { handleError(err, 'logProcess() > if (stats.size > 10000) > fs.writeFile(...)'); }
			})
		} else {
			fs.appendFile('./server/logs/process.log', process, (err) => {
				if (err) { handleError(err, 'logProcess() > if (stats.size > 10000) > fs.writeFile(...)'); }
			})
		}
	})
}

function deleteImage(id) {
	return new Promise((resolve, reject) => {
		fs.stat(`./min/${id}`, (err, stats) => {
			if (err) {
				reject('Image has already been deleted.')
			}

			rimraf(`./min/${id}`, (err) => {
				if (err) {
					return reject('There was an issue deleting this image. Please try again.')
				}
			})

			rimraf(`./min/${id}.zip`, (err) => {
				if (err) {
					return reject('There was an issue deleting this image. Please try again.')
				}
			})

			// i know this might resolve before the functions are done running, but they will still finish their processes in the background...I think?
			resolve(id)
		})
	})
}

module.exports.genId = genId;
module.exports.resizeImage = resizeImage;
module.exports.generateAsyncImage = generateAsyncImage;
module.exports.optimizeImage = optimizeImage;
module.exports.cleanUp = cleanUp;
module.exports.zipDir = zipDir;
module.exports.printCode = printCode;
module.exports.validateSizes = validateSizes;
module.exports.handleError = handleError;
module.exports.emptyDirectory = emptyDirectory;
module.exports.deleteExpired = deleteExpired;
module.exports.collectFiles = collectFiles;
module.exports.logProcess = logProcess;
module.exports.deleteImage = deleteImage;
