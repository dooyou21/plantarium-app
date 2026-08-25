import React from 'react';
import { ChevronRight } from 'lucide-react';

export type ActionItemVariant = 'default' | 'primary' | 'danger' | 'warning';

export interface ActionListItemProps {
  id?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  badgeColor?: string;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  variant?: ActionItemVariant;
  className?: string;
  children?: React.ReactNode;
  /** Custom expansion or confirmation content rendered beneath the row */
  expandedContent?: React.ReactNode;
}

export const ActionListItem: React.FC<ActionListItemProps> = ({
  id,
  icon,
  iconBgColor,
  iconColor,
  title,
  description,
  badge,
  badgeColor,
  rightElement,
  showChevron = false,
  onClick,
  disabled = false,
  variant = 'default',
  className = '',
  children,
  expandedContent,
}) => {
  // Variant styles
  const titleColor =
    variant === 'danger'
      ? 'text-danger-primary'
      : variant === 'warning'
      ? 'text-amber-dark'
      : variant === 'primary'
      ? 'text-plant-primary'
      : 'text-gray-800';

  const defaultIconBg =
    variant === 'danger'
      ? 'bg-danger-bg text-danger-primary'
      : variant === 'warning'
      ? 'bg-amber-bg text-amber-primary'
      : variant === 'primary'
      ? 'bg-plant-bg-subtle text-plant-primary'
      : 'bg-gray-100 text-gray-600';

  const defaultBadgeBg =
    variant === 'danger'
      ? 'bg-danger-bg text-danger-primary border border-danger-border'
      : variant === 'warning'
      ? 'bg-amber-bg text-amber-text border border-amber-border'
      : variant === 'primary'
      ? 'bg-plant-bg-subtle text-plant-primary border border-plant-border-subtle'
      : 'bg-gray-100 text-gray-500 border border-gray-200';

  const isClickable = !!onClick && !disabled;

  return (
    <div className={`group/item relative transition-colors ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`w-full px-4 py-3 sm:px-4.5 sm:py-3.5 flex items-center justify-between gap-3 text-left transition-all ${
          isClickable ? 'hover:bg-gray-50/90 active:bg-gray-100/80 cursor-pointer' : 'cursor-default'
        } ${className}`}
      >
        {/* Left: Icon & Text Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {icon && (
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                isClickable ? 'group-hover/item:scale-105' : ''
              } ${iconBgColor || defaultIconBg} ${iconColor || ''}`}
            >
              {icon}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className={`text-xs sm:text-sm font-semibold truncate ${titleColor}`}>
              {title}
            </div>
            {description && (
              <div className="text-[11px] text-gray-500 mt-0.5 leading-snug break-keep">
                {description}
              </div>
            )}
            {children}
          </div>
        </div>

        {/* Right: Badge / Actions / Chevron */}
        <div className="flex items-center gap-2 shrink-0">
          {badge && (
            <span
              className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${
                badgeColor || defaultBadgeBg
              }`}
            >
              {badge}
            </span>
          )}

          {rightElement}

          {showChevron && (
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover/item:text-gray-600 transition-colors" />
          )}
        </div>
      </button>

      {/* Expanded sub-content (e.g. inline confirmation panel) */}
      {expandedContent && (
        <div className="px-4 pb-3 sm:px-4.5 sm:pb-3.5 pt-0">
          {expandedContent}
        </div>
      )}
    </div>
  );
};

export interface ActionListProps {
  id?: string;
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export const ActionList: React.FC<ActionListProps> = ({
  id,
  title,
  description,
  className = '',
  children,
}) => {
  return (
    <div id={id} className="space-y-1.5">
      {(title || description) && (
        <div className="px-1 mb-1.5">
          {title && (
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              {title}
            </span>
          )}
          {description && (
            <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>
          )}
        </div>
      )}

      <div
        className={`bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden divide-y divide-gray-100 ${className}`}
      >
        {children}
      </div>
    </div>
  );
};
