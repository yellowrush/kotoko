import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@kodoko/ui';
import { useChildren } from '../hooks/useChildren';
import { PageHeader } from '../components/PageHeader';

export function ChildNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { create, creating } = useChildren();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !birthDate || creating) return;
    const created = await create({ displayName: name, birthDate });
    navigate(`/children/${created.id}/edit`);
  }

  return (
    <div>
      <PageHeader title={t('children.new')} />
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">{t('children.name')}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">{t('children.birthDate')}</span>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
          />
        </label>
        <Button type="submit" disabled={creating || !name.trim() || !birthDate}>
          {t('save')}
        </Button>
      </form>
    </div>
  );
}