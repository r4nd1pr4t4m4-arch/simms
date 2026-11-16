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
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), payment=(), usb=()",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
          },
        ],
      },
    ];
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
