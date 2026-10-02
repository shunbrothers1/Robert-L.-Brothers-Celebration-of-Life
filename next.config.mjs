/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't let `next dev`/`next build` write AGENTS.md/CLAUDE.md into the repo.
  agentRules: false,
};

export default nextConfig;
