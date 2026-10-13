/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true, // optional but recommended for static exports
  outputFileTracingIncludes: {
    "/api/certificate-stamp": ["./assets/authorised-signature-faza.png"],
  },
  // output: "export",
  // images: {
  //   unoptimized: true,
  // }
};

export default nextConfig;

