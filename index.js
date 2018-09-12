var digi = require('./DigiParser.js');
var comms = require('ncd-red-comm');
var fs = require('fs');
var xml2js = require('xml2js');
const Queue = require("promise-queue");
var parser = new xml2js.Parser();

var pqueue = new Queue(1);
// function start(usbPort, profile){
function start(s3b, profile){

  //console.log("port:",usbPort);
  console.log("profile:",profile);

  // var serial = new comms.NcdSerial(usbPort, 9600);
  // var s3b = new digi(serial);

  fs.readFile(__dirname + '/profiles/'+profile+'.xml', function(err, data) {
    parser.parseString(data, function (err, result) {
      //console.log(result.data.profile[0].settings[0].setting);
      var settings = result.data.profile[0].settings[0].setting;

      var promises = [];
      settings.forEach(function(element){
        if(element._.length % 2 != 0){
          element._ = '0'+element._;
        }
        var val = Buffer.from(element._, "hex");
        //console.log(element._,[...val],val);
        pqueue.add(() => {
          return new Promise((fulfill, reject) => {
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
          console.log('done');
          s3b.persist_settings().then(fulfill).catch(reject);
        });
      });
      promises.forEach((p) => {
        p.then().catch(console.log);
      });
    });
  });


}

var serial = new comms.NcdSerial(process.argv[2], 9600);
var _s3b = new digi(serial);

function enableApi(s3b){
  return new Promise((fulfill, reject) => {
    s3b.enable_api().then(()=>{
      s3b.persist_settings().then(fulfill).catch(reject);
    }).catch(reject);
  })
}

serial._emitter.once('ready', () => {
  console.log(process.argv);
  enableApi(_s3b).then(() => {
    start(_s3b, process.argv[3])
  }).catch(console.log);
});


// function test(usbPort){
//   var serial = new comms.NcdSerial(usbPort, 9600);
//   serial._emitter.once('ready', () =>{
//     setTimeout(() => {
//       var s3b = new digi(serial);
//       s3b.enable_api().then(()=>{
//         s3b.persist_settings().catch(console.log);
//       }).catch(console.log);
//     }, 1000);
//   });
//
// }
//
// // start(process.argv[2], process.argv[3]);
// test(process.argv[2]);
