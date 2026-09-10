import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without it, a stray lockfile in a
  // parent directory (a home folder, say) makes Next infer the wrong root for
  // file tracing.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
