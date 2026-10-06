/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    // The widget is meant to be iframed on client websites.
    return [{ source: "/widget", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }] }];
  },
};

export default nextConfig;
