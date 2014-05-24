'use strict';

var SerialPort = require('serialport').SerialPort;


var SEND_INTERVAL = 500;
var CHECK_INTERVAL = 50;

function Plugin(messenger, options){
  var self = this;
  this.messenger = messenger;
  this.options = options;
  this.serialPort = new SerialPort(this.options.serialDevice,{
      baudrate: this.options.baudrate || 57600,
      buffersize: this.options.buffersize || 1
  });

  this.lastCheck = Date.now();
  this.lastSend = 0;

  this.serialPort.on('data', function(data){
    if(self.buffer){
      self.buffer = Buffer.concat([self.buffer, data]);
    }else{
      self.buffer = data;
    }
  });

  return this;
}

var optionsSchema = {
  type: 'object',
  properties: {
    serialDevice: {
      type: 'string',
      required: true
    },
    baudrate: {
      type: 'number',
      required: false
    },
    buffersize: {
      type: 'number',
      required: false
    },
    sendUuid: {
      type: 'string|array',
      required: true
    }
  }
};

var messageSchema = {
  type: 'string',
  required: true
};

Plugin.prototype.onMessage = function(data){
  var payload = data.payload;
  if(data.payload && typeof data.payload === 'string'){
    try{
      this.serialPort.write(new Buffer(data, 'base64'));
    }catch(exp){
      console.log('error reading message', exp);
    }
  }

};

Plugin.prototype.transmitData = function(){
  var delta = Date.now() - this.lastCheck;
  this.lastCheck = Date.now();
  this.lastSend += delta;
  if(this.lastSend > SEND_INTERVAL && this.buffer){
    this.lastSend = 0;
    var binaryStr = this.buffer.toString('base64');
    console.log('sending data', binaryStr);
    this.buffer = null;
    this.messenger.send({
      devices : this.options.sendUuid,
      payload : binaryStr
    });
  }
  setTimeout(this.transmitData, CHECK_INTERVAL);
};

Plugin.prototype.destroy = function(){
  var self = this;
  //clean up
  console.log('destroying.', this.options);
  try{
    this.serialPort.close(function(){
      console.log('closed serial port', self.options.serialDevice);
    });
  }catch(closeE){
    console.log('error closing port', closeE);
  }
};


module.exports = {
  Plugin: Plugin,
  optionsSchema: optionsSchema,
  messageSchema: messageSchema
};
