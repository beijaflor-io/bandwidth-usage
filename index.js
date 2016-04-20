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
  } else {
    devices = devices.filter((d) => d.addresses.length);
  }

  this.monitors = {};
  this.devices = devices;

  devices.forEach((device) => {
    this.monitors[device.name] = new DeviceMonitor(device, this.ip);
  });

  this.totalRx = -1;
  this.totalTx = -1;
  this.rxPerSec = -1;
  this.txPerSec = -1;

  this.startSampler();
}
util.inherits(BandwidthUsage, EventEmitter);

BandwidthUsage.prototype.startSampler = function startLogger() {
  setInterval(() => {
    this.totalRx = this.devices.reduce((m, device) => {
      const monitor = this.monitors[device.name];
      return monitor.totalRx + m;
    }, 0);

    this.totalTx = this.devices.reduce((m, device) => {
      const monitor = this.monitors[device.name];
      return monitor.totalTx + m;
    }, 0);

    this.rxPerSec = this.devices.reduce((m, device) => {
      const monitor = this.monitors[device.name];
      return monitor.rxPerSec + m;
    }, 0);

    this.txPerSec = this.devices.reduce((m, device) => {
      const monitor = this.monitors[device.name];
      return monitor.txPerSec + m;
    }, 0);
  }, 500);
};

BandwidthUsage.prototype.startTotalsLogger = function startTotalsLogger() {
  setInterval(() => {
    console.log('received rate', humanize.filesize(this.rxPerSec) + '/s');
    console.log('send rate', humanize.filesize(this.txPerSec) + '/s');
    console.log('total received', humanize.filesize(this.totalRx));
    console.log('total sent', humanize.filesize(this.totalTx));
    console.log('---------');
  }, 2000);
};

BandwidthUsage.prototype.startLoggers = function startLoggers() {
  this.devices.forEach((device) => {
    this.startLogger(this.monitors[device.name], device.name);
  });
};

BandwidthUsage.prototype.startLogger = function startLogger(monitor, name) {
  setInterval(() => {
    console.log(name, 'received rate', humanize.filesize(monitor.rxPerSec) + '/s');
    console.log(name, 'send rate', humanize.filesize(monitor.txPerSec) + '/s');
    console.log(name, 'total received', humanize.filesize(monitor.totalRx));
    console.log(name, 'total sent', humanize.filesize(monitor.totalTx));
    console.log('---------');
  }, 2000);
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
// setTimeout(() => console.log(b.monitors.en0.totalRx), 1000);
//
// const b = new BandwidthUsage();
// b.startLoggers();
//
// const b = new BandwidthUsage();
// b.startTotalsLogger();
