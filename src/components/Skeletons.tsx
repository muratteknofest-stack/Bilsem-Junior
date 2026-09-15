import React from 'react';

export const CardSkeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-white border border-zinc-200 rounded-xl p-4 sm:p-6 animate-pulse ${className}`}>
    <div className="h-5 bg-zinc-200 rounded w-1/3 mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-zinc-100 rounded w-full"></div>
      <div className="h-4 bg-zinc-100 rounded w-5/6"></div>
      <div className="h-4 bg-zinc-100 rounded w-4/6"></div>
    </div>
  </div>
);

export const ChartSkeleton = ({ className = '' }: { className?: string }) => (
  <div className={`bg-white border border-zinc-200 rounded-xl p-4 sm:p-6 animate-pulse flex flex-col ${className}`}>
    <div className="h-5 bg-zinc-200 rounded w-1/4 mb-6"></div>
    <div className="flex-1 flex items-end gap-2 sm:gap-4 mt-auto h-32">
      {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
        <div key={i} className="flex-1 bg-zinc-100 rounded-t" style={{ height: `${h}%` }}></div>
      ))}
    </div>
  </div>
);

export const ProfileBannerSkeleton = () => (
  <section className="relative overflow-hidden rounded-xl bg-zinc-50 animate-pulse p-6 sm:p-8 border border-zinc-200">
    <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
      <div className="flex items-center gap-6 w-full lg:w-auto">
        <div className="w-20 h-20 rounded-xl bg-zinc-200 shrink-0"></div>
        <div className="flex-1 min-w-0 space-y-3">
          <div className="h-7 bg-zinc-200 rounded w-48"></div>
          <div className="h-4 bg-zinc-200 rounded w-32"></div>
          <div className="w-full max-w-xs space-y-2 mt-4">
             <div className="flex justify-between">
                <div className="h-3 bg-zinc-200 rounded w-12"></div>
                <div className="h-3 bg-zinc-200 rounded w-20"></div>
             </div>
             <div className="h-2 w-full bg-zinc-200 rounded-full"></div>
          </div>
        </div>
      </div>
      <div className="w-full lg:w-auto shrink-0 flex gap-4">
         <div className="h-16 bg-zinc-200 rounded-xl flex-1 lg:w-32"></div>
         <div className="h-16 bg-zinc-200 rounded-xl flex-1 lg:w-32"></div>
      </div>
    </div>
  </section>
);

export const DailyTaskSkeleton = () => (
  <article className="bg-white border border-zinc-200 rounded-xl p-4 flex items-start gap-4 animate-pulse">
    <div className="w-12 h-12 rounded-xl bg-zinc-100 shrink-0"></div>
    <div className="flex-1 space-y-3">
      <div className="h-4 bg-zinc-200 rounded w-1/2"></div>
      <div className="h-3 bg-zinc-100 rounded w-3/4"></div>
      <div className="flex items-center gap-3 mt-3">
         <div className="h-1.5 bg-zinc-100 rounded-full flex-1"></div>
         <div className="h-3 bg-zinc-200 rounded w-8"></div>
      </div>
    </div>
  </article>
);

export const ModeCardSkeleton = () => (
  <div className="p-4 rounded-xl border border-zinc-200 bg-white animate-pulse flex flex-col justify-between gap-4 h-[140px]">
    <div className="flex justify-between items-start">
      <div className="w-10 h-10 bg-zinc-100 rounded-xl"></div>
      <div className="h-5 bg-zinc-100 rounded w-16"></div>
    </div>
    <div className="space-y-2 mt-auto">
      <div className="h-4 bg-zinc-200 rounded w-3/4"></div>
      <div className="h-3 bg-zinc-100 rounded w-full"></div>
    </div>
  </div>
);

export const MasterySkeleton = () => (
  <div className="bg-white p-4 border border-zinc-200 rounded-xl animate-pulse flex flex-col justify-between">
    <div className="flex justify-between items-center mb-3">
      <div className="h-4 bg-zinc-200 rounded w-1/2"></div>
      <div className="h-4 bg-zinc-100 rounded w-8"></div>
    </div>
    <div className="h-1.5 w-full bg-zinc-100 rounded-full mb-2"></div>
    <div className="h-3 bg-zinc-100 rounded w-1/3"></div>
  </div>
);
