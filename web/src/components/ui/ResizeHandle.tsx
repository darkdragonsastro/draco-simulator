import { Separator } from 'react-resizable-panels';
import { GripVertical, GripHorizontal } from 'lucide-react';

export function ResizeHandle({ direction = 'horizontal' }: { direction?: 'horizontal' | 'vertical' }) {
  const isVertical = direction === 'vertical';

  return (
    <Separator
      className={`resize-handle ${
        isVertical ? 'h-1.5 cursor-row-resize' : 'w-1.5 cursor-col-resize'
      } bg-nina-border`}
    >
      <div className="flex items-center justify-center w-full h-full">
        {isVertical ? (
          <GripHorizontal size={10} className="text-nina-text-dim" />
        ) : (
          <GripVertical size={10} className="text-nina-text-dim" />
        )}
      </div>
    </Separator>
  );
}
