import React from 'react';

export const UbdenBrand: React.FC<{ variant?: 'small' | 'medium' | 'large' }> = ({ variant = 'small' }) => {
  const sizes = {
    small: {
      text: 'text-[10px]',
      sup: 'text-[6px]',
      gap: 'gap-1'
    },
    medium: {
      text: 'text-xs',
      sup: 'text-[8px]',
      gap: 'gap-1.5'
    },
    large: {
      text: 'text-sm',
      sup: 'text-[10px]',
      gap: 'gap-2'
    }
  };

  const size = sizes[variant];

  return (
    <div className={`flex items-center ${size.gap} text-slate-600`}>
      <span className={size.text}>Powered by</span>
      <span className={`${size.text} font-semibold text-indigo-400`}>
        Ubden<sup className={size.sup}>®</sup>
      </span>
    </div>
  );
};

