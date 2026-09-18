import React from 'react';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';

interface IframeWarningBannerProps {}

export const IframeWarningBanner: React.FC<IframeWarningBannerProps> = () => {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/80 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>真实蓝牙提示：</strong>部分浏览器在网页预览 iframe 中限制了物理蓝牙硬件权限。如遇真机蓝牙无法搜索，请
            <button
              type="button"
              onClick={() => window.open(window.location.href, '_blank')}
              className="underline font-bold hover:text-amber-900 dark:hover:text-white mx-1 inline-flex items-center gap-0.5"
            >
              在新标签页独立打开
              <ExternalLink className="h-3 w-3" />
            </button>
            ，或在 Android 原生 WebView App 中集成使用。
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-white p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
