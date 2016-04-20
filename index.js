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
    let totalIncoming = 0;
    let totalOutgoing = 0;

    c.on('packet', (size) => {
      if (link === 'ETHERNET') {
        let ret = decoders.Ethernet(buffer);

        if (ret.info.type === PROTOCOL.ETHERNET.IPV4) {
          ret = decoders.IPV4(buffer, ret.offset);
          if (ret.info.srcaddr === myip) {
            totalIncoming += size;
            console.log(device.name, 'got incoming', humanize.filesize(size));
          } else {
            totalOutgoing += size;
            console.log(device.name, 'got outgoing', humanize.filesize(size));
          }
        }
      }

      console.log(device.name, 'total incoming', humanize.filesize(totalIncoming));
      console.log(device.name, 'total outgoing', humanize.filesize(totalOutgoing));
    });
  }
});
