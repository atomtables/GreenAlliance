
export const Snowflake: () => string = (() => {
  const EPOCH = 1577836800000; // 2020-01-01
  const SEQUENCE_BITS = 12;
  const WORKER_ID_BITS = 10; // fixed to 0
  const MAX_SEQUENCE = (1 << SEQUENCE_BITS) - 1;

  let lastTimestamp = -1;
  let sequence = 0;

  const waitNextMillis = (ts) => {
    let cur = Date.now();
    while (cur <= ts) cur = Date.now();
    return cur;
  };

  const mulBy2 = (str) => {
    let carry = 0;
    let out = "";
    for (let i = str.length - 1; i >= 0; i--) {
      const n = (str.charCodeAt(i) - 48) * 2 + carry;
      carry = n >= 10 ? 1 : 0;
      out = (n % 10) + out;
    }
    return carry ? "1" + out : out;
  };

  const shiftLeft = (decStr, bits) => {
    let result = decStr;
    for (let i = 0; i < bits; i++) {
      result = mulBy2(result);
    }
    return result;
  };

  const add = (decStr, n) => {
    let carry = n;
    let out = "";
    for (let i = decStr.length - 1; i >= 0; i--) {
      const sum = (decStr.charCodeAt(i) - 48) + carry;
      carry = sum >= 10 ? 1 : 0;
      out = (sum % 10) + out;
    }
    return carry ? "1" + out : out;
  };

  return function Snowflake(): string {
    let timestamp = Date.now();

    if (timestamp < lastTimestamp) {
      throw new Error("Clock moved backwards");
    }

    if (timestamp === lastTimestamp) {
      sequence = (sequence + 1) & MAX_SEQUENCE;
      if (sequence === 0) {
        timestamp = waitNextMillis(lastTimestamp);
      }
    } else {
      sequence = 0;
    }

    lastTimestamp = timestamp;

    const timePart = String(timestamp - EPOCH);

    // shift by workerId (0) + sequence bits
    let id = shiftLeft(timePart, SEQUENCE_BITS + WORKER_ID_BITS);
    id = add(id, sequence);

    return id;
  };
})();