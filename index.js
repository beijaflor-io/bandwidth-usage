'use strict';
const Cap = require('cap').Cap;
const EventEmitter = require('events');
const decoders = require('cap').decoders;
const humanize = require('humanize');
const myLocalIp = require('my-local-ip');
const util = require('util');

const PROTOCOL = decoders.PROTOCOL;
const bufSize = 10 * 1024 * 1024;
const buffer = new Buffer(bufSize);

function BandwidthUsage(options) {
  if (!options) options = {};
  EventEmitter.call(this, options);
  this.ip = myLocalIp;

  let devices = Cap.deviceList();
  if (options.interfaces) {
    devices = devices.filter((d) => options.interfaces.indexOf(d.name) !== -1);
  }

  this.monitors = {};
  this.devices = devices;

  devices.forEach((device) => {
    this.monitors[device.name] = new DeviceMonitor(device, this.ip);
  });
}
util.inherits(BandwidthUsage, EventEmitter);

BandwidthUsage.prototype.startLogger = function startLogger(monitor, name) {
  setInterval(() => {
    console.log(name, 'received rate', humanize.filesize(monitor.rxPerSec) + '/s');
    console.log(name, 'send rate', humanize.filesize(monitor.txPerSec) + '/s');
    console.log(name, 'total received', humanize.filesize(monitor.totalRx));
    console.log(name, 'total sent', humanize.filesize(monitor.totalTx));
    console.log('---------');
  }, 2000);
};

BandwidthUsage.prototype.startLoggers = function startLoggers() {
  this.devices.forEach((device) => {
    this.startLogger(this.monitors[device.name], device.name);
  });
};

exports = module.exports = BandwidthUsage;

function DeviceMonitor(device, ip) {
  const c = new Cap();
  const link = c.open(device.name, '', bufSize, buffer);
  this.totalRx = 0;
  this.totalTx = 0;
  this.rxPerSec = 0;
  this.txPerSec = 0;

  c.on('packet', (size) => {
    if (link === 'ETHERNET') {
      let ret = decoders.Ethernet(buffer);

      if (ret.info.type === PROTOCOL.ETHERNET.IPV4) {
        ret = decoders.IPV4(buffer, ret.offset);
        if (ret.info.srcaddr !== ip) {
          this.totalRx += size;
        } else {
          this.totalTx += size;
        }
      }
    }
  });

  let lastTotalRx = this.totalRx || 0;
  let lastTotalTx = this.totalTx || 0;
  setInterval(() => {
    this.rxPerSec = Math.abs((this.totalRx - lastTotalRx));
    lastTotalRx = this.totalRx;
    this.txPerSec = Math.abs((this.totalTx - lastTotalTx));
    lastTotalTx = this.totalTx;
  }, 1000);
}

// const b = new BandwidthUsage();
// b.startLoggers();
