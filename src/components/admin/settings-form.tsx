'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { FormMessage, Input, Textarea } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';
import { cn } from '@/lib/utils';

export interface SettingField {
  key: string;
  value: string;
  type: string;
  isSecret: boolean;
  label: string;
  description: string | null;
  hasSecretValue: boolean;
  /** Declared long-form text, rather than guessed from the key name. */
  multiline?: boolean;
  placeholder?: string;
}

export function SettingsForm({
  category,
  settings,
  editable,
}: {
  category: string;
  settings: SettingField[];
  editable: boolean;
}) {
  const { loading, error, success, submit } = useApiForm('/api/dashboard/settings', {
    resetForm: false,
    successMessage: 'Settings saved.',
  });

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <input type="hidden" name="category" value={category} />

      <div className="grid gap-5 sm:grid-cols-2">
        {settings.map((setting) => (
          <SettingInput key={setting.key} setting={setting} disabled={!editable} />
        ))}
      </div>

      {error && <FormMessage tone="error">{error}</FormMessage>}
      {success && <FormMessage tone="success">{success}</FormMessage>}

      {editable && (
        <Button type="submit" loading={loading}>
          Save {category} settings
        </Button>
      )}
    </form>
  );
}

function SettingInput({
  setting,
  disabled,
}: {
  setting: SettingField;
  disabled: boolean;
}) {
  const [checked, setChecked] = React.useState(setting.value === 'true');
  const name = `setting:${setting.key}`;
  const label = setting.label.charAt(0).toUpperCase() + setting.label.slice(1);

  if (setting.type === 'BOOLEAN') {
    return (
      <div className="sm:col-span-2">
        <label
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-field border border-border p-4 transition-colors',
            checked && 'border-primary bg-primary-soft',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <input
            type="checkbox"
            name={name}
            checked={checked}
            disabled={disabled}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4.5 w-4.5 rounded border-border text-primary"
          />
          <span>
            <span className="block text-sm font-medium">{label}</span>
            {setting.description && (
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {setting.description}
              </span>
            )}
          </span>
        </label>
      </div>
    );
  }

  if (setting.isSecret) {
    return (
      <Input
        label={label}
        name={name}
        type="password"
        defaultValue=""
        disabled={disabled}
        autoComplete="off"
        placeholder={setting.hasSecretValue ? '•••••••• (set — leave blank to keep)' : 'Not set'}
        hint={
          setting.description ??
          'Stored server-side only. Leaving this blank keeps the existing value.'
        }
        wrapperClassName="sm:col-span-2"
      />
    );
  }

  if (setting.multiline) {
    return (
      <Textarea
        label={label}
        name={name}
        rows={3}
        defaultValue={setting.value}
        disabled={disabled}
        placeholder={setting.placeholder}
        hint={setting.description ?? undefined}
        wrapperClassName="sm:col-span-2"
      />
    );
  }

  return (
    <Input
      label={label}
      name={name}
      type={setting.type === 'NUMBER' ? 'number' : 'text'}
      defaultValue={setting.value}
      disabled={disabled}
      placeholder={setting.placeholder}
      hint={setting.description ?? undefined}
    />
  );
}
