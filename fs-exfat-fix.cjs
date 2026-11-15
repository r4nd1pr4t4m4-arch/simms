const fs = require("fs");

const reqFlag = `--require ${JSON.stringify(__filename)}`;
if (!process.env.NODE_OPTIONS || !process.env.NODE_OPTIONS.includes("fs-exfat-fix.cjs")) {
  process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ""} ${reqFlag}`.trim();
}

const origReadlink = fs.readlink.bind(fs);
fs.readlink = function (path, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = undefined;
  }
  return origReadlink(path, options, (err, linkString) => {
    if (err && err.code === "EISDIR") {
      err.code = "EINVAL";
    }
    if (callback) callback(err, linkString);
  });
};

const origReadlinkSync = fs.readlinkSync.bind(fs);
fs.readlinkSync = function (path, options) {
  try {
    return origReadlinkSync(path, options);
  } catch (err) {
    if (err && err.code === "EISDIR") {
      err.code = "EINVAL";
    }
    throw err;
  }
};

if (fs.promises && fs.promises.readlink) {
  const origPromisesReadlink = fs.promises.readlink.bind(fs.promises);
  fs.promises.readlink = async function (path, options) {
    try {
      return await origPromisesReadlink(path, options);
    } catch (err) {
      if (err && err.code === "EISDIR") {
        err.code = "EINVAL";
      }
      throw err;
    }
  };
}
