/** @type {import('next').NextConfig} */

// Read the production hostname from an environment variable
const publicHostname = process.env.PUBLIC_HOSTNAME;

// Start with the default pattern for local development
const remotePatterns = [
  {
    protocol: 'http',
    hostname: 'localhost',
  },
];

// If a public hostname is provided in the environment, add it to the list
if (publicHostname) {
  remotePatterns.push({
    protocol: 'https',
    hostname: publicHostname,
  });
}

const nextConfig = {
  images: {
    remotePatterns,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
