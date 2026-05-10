'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiConfig } from '@/lib/store';

interface SettingsDialogProps {
  config: ApiConfig;
  onSave: (config: ApiConfig) => void;
}

export function SettingsDialog({ config, onSave }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState<ApiConfig>(config);

  const handleSave = () => {
    onSave(localConfig);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 w-10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>API 设置</DialogTitle>
          <DialogDescription>
            配置 AI 模型的 API 地址和密钥
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="apiFormat" className="text-right">
              API 格式
            </label>
            <select
              id="apiFormat"
              className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={localConfig.apiFormat}
              onChange={(e) =>
                setLocalConfig({
                  ...localConfig,
                  apiFormat: e.target.value as 'openai' | 'anthropic',
                })
              }
            >
              <option value="openai">OpenAI 兼容</option>
              <option value="anthropic">Anthropic 兼容</option>
            </select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="baseUrl" className="text-right">
              API 地址
            </label>
            <Input
              id="baseUrl"
              className="col-span-3"
              value={localConfig.baseUrl}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, baseUrl: e.target.value })
              }
              placeholder="例如：https://api.openai.com/v1"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="apiKey" className="text-right">
              API Key
            </label>
            <Input
              id="apiKey"
              type="password"
              className="col-span-3"
              value={localConfig.apiKey}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, apiKey: e.target.value })
              }
              placeholder="sk-..."
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="model" className="text-right">
              模型
            </label>
            <Input
              id="model"
              className="col-span-3"
              value={localConfig.model}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, model: e.target.value })
              }
              placeholder="例如：gpt-4、claude-3-sonnet"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
