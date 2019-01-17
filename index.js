var digi = require('./DigiParser.js');
const comms = require('ncd-red-comm');
var fs = require('fs');

const Queue = require("promise-queue");
const pqueue = new Queue(1);

var xml2js = require('xml2js');

const config = require('./config');

process.on('unhandledRejection', (r) => {
  console.error('Error thrown: ');
  console.error(r);
  process.kill(1);
});

if(process.argv[2] == 'help'){


}else{
	if(!process.argv[2]){
		config.collect().then((opts) => {
			var cmd = ["npm start", opts.op, opts.port, opts.baudrate, opts.filename].join(' ');
			console.log('To repeat this action, simply run: ');
			console.log("\x1b[7m"+cmd+"\x1b[0m");
			start(opts);
		});
	}else{
		start({
			op: process.argv[2],
			port: process.argv[3],
			baudrate: process.argv[4],
			filename: process.argv[5]
		});
	}
}

function start(opts){
	var serial = new comms.NcdSerial(opts.port, parseInt(opts.baudrate));
	var s3b = new digi(serial);
	serial._emitter.once('ready', () => {
		if(opts.op == 'load') load(s3b, opts.filename);
		else if(opts.op == 'save') save(s3b, opts.filename);
	});
}

function save(s3b, fn, cm){
	var builder = new xml2js.Builder();
	var backupCmds = ["CM","HP","ID","MT","PL","RR","CE","BH","NH","MR","NN","DH","DL","TO","NI","NT","NO","CI","EE","KY","BD","NB","SB","RO","FT","AP","AO","D0","D1","D2","D3","D4","D5","D6","D7","D8","D9","P0","P1","P2","P3","P4","PD","PR","M0","M1","LT","RP","AV","IC","IF","IR","SM","SO","SN","SP","ST","WH","CC","CT","GT","DD"];
	var data = {data:{profile:[{description_file:[fn.substr(fn.lastIndexOf('/')+1)],settings:[{setting:[]}]}]}};
	var settings = [];
	console.log('Enabling API Mode');
	s3b.enable_api(cm).then(()=>{
		s3b.persist_settings().then(() => {
			var pInd = ['|', '/', '-', "\\"];
			backupCmds.forEach((command) => {
				pqueue.add(() => {
					return new Promise((fulfill, reject) => {
						s3b.send.at_command(command).then((r)=>{
							if(r.data){
								var val = parseInt(r.data.map(v => ("00" + v.toString(16)).substr(-2)).join(''), 16).toString(16);
								//console.log(command, val);
								settings.push({'$':{command:command},'_':val});
								process.stdout.clearLine();
								process.stdout.cursorTo(0);

								process.stdout.write('Reading Settings '+pInd[0]);
								pInd.push(pInd.shift());
							}
							fulfill();
						}).catch((err) => {
							console.log(err);
							reject();
						});
					});
				});
			});
			pqueue.add(() => {
				return new Promise((fulfill, reject) => {
					data.data.profile[0].settings[0].setting = settings;
					var xml = builder.buildObject(data);
					process.stdout.clearLine();
					process.stdout.cursorTo(0);
					console.log('Reading Settings Complete.');
					console.log('Writing settings to file.');
					fs.writeFile(fn, xml, (err) => {
						if(err) console.log(err);
						else{
							console.log(fn + ' Successfully Written.');
						}
						fulfill();
						process.exit();
					});
				});
			});
		});
	}).catch((err) => {
		if(err.error_code == 408){
			s3b.serial.serial.update({baudRate:9600}, (err) => {
				if(!err){
					s3b.serial.serial.set({brk:true}, (err) => {
						if(!err){
							console.log('Reset the device now');
							s3b._emitter.once('powerup', () => {
								s3b.serial.serial.set({brk:false}, (err) => {
									if(!err){
										load(s3b, fn, true);
									}
								});
							});
						}
					});
				}
			});
		}else{
			console.log('Could not communicate with module, please check baud rate.');
			process.exit();
		}
	});
}

function load(s3b, fn, cm){
	var parser = new xml2js.Parser();
	var cmds = [];
	console.log('Enabling API Mode');
	s3b.enable_api(cm).then(()=>{
		//s3b.persist_settings().then(() => {
			fs.readFile(fn, function(err, data) {
				parser.parseString(data, function (err, result) {
					var settings = result.data.profile[0].settings[0].setting;
					process.stdout.write('Updating Settings: 0%');
					// console.log('Updating settings');
					settings.forEach(function(element, i){
						if(element._.length % 2 != 0){
							element._ = '0'+element._;
						}
						var val = Buffer.from(element._, "hex");
						pqueue.add(() => {
							return new Promise((fulfill, reject) => {
								cmds.push(element.$.command);
								process.stdout.clearLine();
								process.stdout.cursorTo(0);

								var perc = Math.floor(((i+1)/settings.length)*100);
								process.stdout.write('Updating Settings: '+perc+'%');

								s3b.send.at_command(element.$.command, [...val], true).then(()=>{
									fulfill();
								}).catch((err) => {
									console.log('at command error', err);
									reject();
								});
							});
						});
					});
					pqueue.add(() => {
						return new Promise((fulfill, reject) => {
							console.log('');
							console.log('Writing changes');
							s3b.persist_settings().then(() => {
								//s3b.send.at_command('FR').then(() => {
									fulfill();
									console.log('Finished!');
									process.exit();
								//});
							}).catch(reject);
						});
					});
				});
			});
	}).catch((err) => {
		if(err.error_code == 408){
			s3b.serial.serial.update({baudRate:9600}, (err) => {
				if(!err){
					s3b.serial.serial.set({brk:true}, (err) => {
						if(!err){
							console.log('Reset the device now');
							s3b._emitter.once('powerup', () => {
								s3b.serial.serial.set({brk:false}, (err) => {
									if(!err){
										load(s3b, fn, true);
									}
								});
							});
						}
					});
				}
			});
		}else{
			console.log('Could not communicate with module, please check baud rate.');
			process.exit();
		}
	});
}
