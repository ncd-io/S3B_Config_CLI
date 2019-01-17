const sp = require('serialport');
const inquirer = require('inquirer');
var fs = require('fs');

var prompt = inquirer.createPromptModule();

module.exports = {
	collect: selectPort,
	opts: {
		op: 'load',
		port: '',
		baudrate: '115200',
		filename: ''
	}
};

function selectPort(){
	return new Promise((f, r) => {
		sp.list().then((ports) => {
			var names = ports.map(o => o.comName);
			prompt([{
				name: 'port',
				type: 'list',
				message: `Please select an option below, then hit enter:`,
				choices: names
			},{
				name: 'baudrate',
				type: 'list',
				message: `Please select the baudrate for your module, then hit enter:`,
				choices: ["230400","115200","57600","38400","19200","9600","4800","2400"],
				default: "115200"
			},{
				name: 'op',
				type: 'list',
				message: `Please select an operation to perform:`,
				choices: [{value: "load", name: "Load Settings from File"}, {value: "save", name: "Backup Settings to File"}],
			}]).then((r) => {
				for(var i in r) module.exports.opts[i] = r[i];
				if(r.op == "load"){
					var files = fs.readdirSync('./profiles', {withFileTypes: true}).filter(v => v.split('.').pop() == 'xml');
					if(!files){
						//Allow them to enter full filepath to profile
					}else{
						prompt({
							name: 'filename',
							type: 'list',
							message: 'Please select a profile from below to load, then hit enter:',
							choices: files
						}).then((r) => {
							module.exports.opts.filename = __dirname + '/profiles/' + r.filename;
							f(module.exports.opts);
						});
					}
				}else{
					prompt({
						name: 'filename',
						type: 'input',
						message: 'Please enter a filename to save this profile as (without the .xml extension), and hit enter:'
					}).then((r) => {
						module.exports.opts.filename = __dirname + '/profiles/' + r.filename + '.xml';
						f(module.exports.opts);
					});
				}
			});
		}).catch(console.log);
	});
}
