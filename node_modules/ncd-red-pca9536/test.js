var comms = require('ncd-red-comm');
var PCA9536 = require('./index.js');
process.on('uncaughtException', function (err) {
  console.log(err);
})

/*
 * Allows use of a USB to I2C converter form ncd.io
 */
var port = '/dev/tty.usbserial-DN03Q7F9';
var serial = new comms.NcdSerial(port, 115200);
var comm = new comms.NcdSerialI2C(serial, 0);
/*
 * Use the native I2C port on the Raspberry Pi
 */
//var comm = new comms.NcdI2C(1);

/*
 * Initialize as a 4-channel relay board
 */
// 1 = output, 2 = input


if(process.argv.length && process.argv[2] == 'inputs'){
	var config = {
		io_1: 0,
		io_2: 0,
		io_3: 0,
		io_4: 0,
	}

	var relay_board = new PCA9536(0x41, config, comm);
	console.log('checking inputs:');
	function get_inputs(){
		relay_board.get().then((status) => {
			console.log(status);
			setTimeout(get_inputs, 1000);
		}).catch(console.log);
	}
	get_inputs();
}else{
	var config = {
		io_1: 1,
		io_2: 1,
		io_3: 0,
		io_4: 0,
	}

	var relay_board = new PCA9536(0x41, config, comm);
	var current_relay = 1;
	console.log('testing relays');
	function switch_relay(){
		relay_board.get().then((status) => {
			//channel_1 is the first argument to set the first GPIO
			var ch = 'channel_'+current_relay;

			//a value of 1 will turn on an output, 0 will turn it off
			var update = status[ch] == 1 ? 0 : 1;

			relay_board.set(ch, update).then(() => {
				current_relay = current_relay == 2 ? 1 : 2;
				switch_relay();
			}).catch(console.log);
		}).catch(console.log);
	}
   switch_relay();
}
