/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Generated clips are served from whatever provider ran the job.
  // Video/img tags are used directly, so no next/image domain config is needed.
};

export default nextConfig;
