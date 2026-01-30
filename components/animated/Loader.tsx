import React from 'react';

const PrecisionTrainLoader = () => {
  return (
    <div className="flex items-end justify-center space-x-1 h-12">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="w-2 bg-indigo-500 rounded-t-md animate-pulse"
          style={{
            animationDuration: '1s',
            animationDelay: `${i * 0.15}s`, // Each bar waits 0.15s longer
          }}
        ></div>
      ))}
    </div>
  );
};

export default PrecisionTrainLoader;