var digi = require('./DigiParser.js');
const comms = require('ncd-red-comm');
var fs = require('fs');

const Queue = require("promise-queue");
const pqueue = new Queue(1);

var xml2js = require('xml2js');

const config = require('./config');


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
	if(opts.op == 'load') load(opts.port, opts.baudrate, opts.filename);
	else if(opts.op == 'save') save(opts.port, opts.baudrate, opts.filename);
}

function save(port, br, fn){
	var builder = new xml2js.Builder();
	var serial = new comms.NcdSerial(port, parseInt(br));
	var s3b = new digi(serial);
	var backupCmds = ["CM","HP","ID","MT","PL","RR","CE","BH","NH","MR","NN","DH","DL","TO","NI","NT","NO","CI","EE","KY","BD","NB","SB","RO","FT","AP","AO","D0","D1","D2","D3","D4","D5","D6","D7","D8","D9","P0","P1","P2","P3","P4","PD","PR","M0","M1","LT","RP","AV","IC","IF","IR","SM","SO","SN","SP","ST","WH","CC","CT","GT","DD"];
	var data = {data:{profile:[{description_file:[fn.substr(fn.lastIndexOf('/')+1)],settings:[{setting:[]}]}]}};
	var settings = [];
	serial._emitter.once('ready', () => {
		s3b.enable_api().then(()=>{
			s3b.persist_settings().then(() => {
				backupCmds.forEach((command) => {
					pqueue.add(() => {
						return new Promise((fulfill, reject) => {
							s3b.send.at_command(command).then((r)=>{
								if(r.data){
									var val = parseInt(r.data.map(v => ("00" + v.toString(16)).substr(-2)).join(''), 16).toString(16);
									//console.log(command, val);
									settings.push({'$':{command:command},'_':val});
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
						fs.writeFile(fn, xml, (err) => {
							if(err) console.log(err);
							else{
								console.log(fn + 'successfully created.');
							}
							fulfill();
							process.exit();
						});
					});
				});
			});
		});
	});
}

function load(port, br, fn){
	var parser = new xml2js.Parser();
	var serial = new comms.NcdSerial(port, parseInt(br));
	var s3b = new digi(serial);
	var cmds = [];
	serial._emitter.once('ready', () => {
		s3b.enable_api().then(()=>{
			s3b.persist_settings().then(() => {
				fs.readFile(fn, function(err, data) {
					parser.parseString(data, function (err, result) {
						var settings = result.data.profile[0].settings[0].setting;
						settings.forEach(function(element){
							if(element._.length % 2 != 0){
								element._ = '0'+element._;
							}
							var val = Buffer.from(element._, "hex");
							pqueue.add(() => {
								return new Promise((fulfill, reject) => {
									cmds.push(element.$.command);
									s3b.send.at_command(element.$.command, [...val]).then(()=>{
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
								s3b.persist_settings().then(() => {
									fulfill();
									process.exit();
								}).catch(reject);
							});
						});
					});
				});
			}).catch((err) => {
				console.log('Unable to persist S3B settings.');
			});
		}).catch((err) => {
			console.log('Unable to enter API mode.');
		});
	});
}
