# bandwidth-usage
**WIP** Just laying out the APIs.

This module will provide a way of measuring bandwidth usage using `libpcap` for
other JavaScript programs.

```javascript
const BandwidthUsage = require('bandwidth-usage');
const b = new BandwithUsage();
b.monitors             // => {"en0": ..., "en1": ...}
b.monitors.en0.totalRx // => 308129
b.totalRx              // => 308129 + all other interfaces' rxs
```

## License
MIT
