'use client';

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-white grid-bg">
      {/* Animated Gradient Blobs */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-50 to-blue-100 rounded-full blur-3xl opacity-60 animate-float-1" />
      
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-gradient-to-r from-purple-50 to-pink-50 rounded-full blur-3xl opacity-50 animate-float-2" />
      
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-full blur-3xl opacity-70 animate-float-3" />
      
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-full blur-3xl opacity-45 animate-float-4" />
      
      <div className="absolute -bottom-40 left-1/3 w-88 h-88 bg-gradient-to-r from-pink-50 to-rose-50 rounded-full blur-3xl opacity-55 animate-float-5" />
      
      {/* Additional smaller blobs for depth */}
      <div className="absolute top-3/4 right-1/3 w-48 h-48 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-full blur-2xl opacity-50 animate-float-2" style={{ animationDelay: '-5s' }} />
      
      <div className="absolute top-1/6 right-1/2 w-56 h-56 bg-gradient-to-r from-violet-50 to-purple-50 rounded-full blur-2xl opacity-45 animate-float-1" style={{ animationDelay: '-10s' }} />
      {/* Gradient Blob 1 */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full blur-3xl opacity-60 animate-float-1" />
      
      {/* Gradient Blob 2 */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full blur-3xl opacity-70 animate-float-2" />
      
      {/* Gradient Blob 3 */}
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-gradient-to-r from-teal-50 to-cyan-100 rounded-full blur-3xl opacity-90 animate-float-3" />
      
      {/* Gradient Blob 4 */}
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full blur-3xl opacity-60 animate-float-4" />
      
      {/* Gradient Blob 5 */}
      <div className="absolute -bottom-40 left-1/3 w-88 h-88 bg-gradient-to-r from-pink-50 to-rose-100 rounded-full blur-3xl opacity-70 animate-float-5" />
      
      {/* Additional smaller blobs for depth */}
      <div className="absolute top-3/4 right-1/3 w-48 h-48 bg-gradient-to-r from-emerald-50 to-teal-100 rounded-full blur-2xl opacity-60 animate-float-2" style={{ animationDelay: '-5s' }} />
      
      <div className="absolute top-1/6 right-1/2 w-56 h-56 bg-gradient-to-r from-violet-50 to-purple-100 rounded-full blur-2xl opacity-55 animate-float-1" style={{ animationDelay: '-10s' }} />
    </div>
  );
}
export { getTeamPageProps as getServerSideProps } from "../../lib/server/teamAuth";
