'use strict';
const Cap = require('cap').Cap;
const decoders = require('cap').decoders;
const humanize = require('humanize');

const PROTOCOL = decoders.PROTOCOL;
const bufSize = 10 * 1024 * 1024;
const buffer = new Buffer(bufSize);
const myip = '192.168.1.125';

Cap.deviceList().forEach((device) => {
  if (device.addresses.length) {
    const c = new Cap();
    const link = c.open(device.name, '', bufSize, buffer);
    let totalRx = 0;
    let totalTx = 0;
    let rxPerSec = 0;
    let txPerSec = 0;

    c.on('packet', (size) => {
      if (link === 'ETHERNET') {
        let ret = decoders.Ethernet(buffer);

        if (ret.info.type === PROTOCOL.ETHERNET.IPV4) {
          ret = decoders.IPV4(buffer, ret.offset);
          if (ret.info.srcaddr !== myip) {
            totalRx += size;
            console.log(device.name, 'received', humanize.filesize(size));
          } else {
            totalTx += size;
            console.log(device.name, 'sent', humanize.filesize(size));
          }
        }
      }

      console.log(device.name, 'received rate', humanize.filesize(rxPerSec) + '/s');
      console.log(device.name, 'send rate', humanize.filesize(txPerSec) + '/s');
      console.log(device.name, 'total received', humanize.filesize(totalRx));
      console.log(device.name, 'total sent', humanize.filesize(totalTx));
    });

    let lastTotalRx = totalRx || 0;
    let lastTotalTx = totalTx || 0;
    setInterval(() => {
      rxPerSec = Math.abs((totalRx - lastTotalRx));
      lastTotalRx = totalRx;
      txPerSec = Math.abs((totalTx - lastTotalTx));
      lastTotalTx = totalTx;
    }, 1000);
  }
});
