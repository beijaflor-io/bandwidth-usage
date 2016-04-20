'use strict';
const Cap = require('cap').Cap;
const EventEmitter = require('events');
const decoders = require('cap').decoders;
const humanize = require('humanize');
const util = require('util');

const PROTOCOL = decoders.PROTOCOL;
const bufSize = 10 * 1024 * 1024;
const buffer = new Buffer(bufSize);
const myip = '192.168.1.125';

function BandwidthUsage(options) {
  if (!options) options = {};
  EventEmitter.call(this, options);

  let devices = Cap.deviceList();
  if (options.interfaces) {
    devices = devices.filter((d) => options.interfaces.indexOf(d.name) !== -1);
  }

  this.monitors = {};

  devices.forEach((device) => {
    this.monitors[device.name] = new DeviceMonitor(device);
  });

  devices.forEach((device) => {
    this.startLogger(this.monitors[device.name], device.name);
  });
}
util.inherits(BandwidthUsage, EventEmitter);

function DeviceMonitor(device) {
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
        if (ret.info.srcaddr !== myip) {
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

BandwidthUsage.prototype.startLogger = function startLogger(monitor, name) {
  setInterval(() => {
    console.log(name, 'received rate', humanize.filesize(monitor.rxPerSec) + '/s');
    console.log(name, 'send rate', humanize.filesize(monitor.txPerSec) + '/s');
    console.log(name, 'total received', humanize.filesize(monitor.totalRx));
    console.log(name, 'total sent', humanize.filesize(monitor.totalTx));
    console.log('---------');
  }, 2000);
};

new BandwidthUsage();
