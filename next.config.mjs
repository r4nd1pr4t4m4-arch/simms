import fs from "fs";

// Normalisasi error readlink pada drive exFAT/Windows (EISDIR -> EINVAL)
const origReadlink = fs.readlink.bind(fs);
fs.readlink = ((path, options, callback) => {
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
});

const origReadlinkSync = fs.readlinkSync.bind(fs);
fs.readlinkSync = ((path, options) => {
  try {
    return origReadlinkSync(path, options);
  } catch (err) {
    if (err && err.code === "EISDIR") {
      err.code = "EINVAL";
    }
    throw err;
  }
});

if (fs.promises && fs.promises.readlink) {
  const origPromisesReadlink = fs.promises.readlink.bind(fs.promises);
  fs.promises.readlink = async (path, options) => {
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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    outputFileTracingIncludes: {
      "/api/portal/[portal]": ["./Prototype *.html"],
    },
  },
  webpack: (config) => {
    config.resolve.symlinks = false;
    config.cache = false;
    return config;
  },
};

export default nextConfig;
