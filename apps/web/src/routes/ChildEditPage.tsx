import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@kodoko/ui';
import { useChildren } from '../hooks/useChildren';
import { PageHeader } from '../components/PageHeader';

export function ChildEditPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { childId } = useParams();
  const { children, update, remove, loading } = useChildren();

  const child = children.find((c) => c.id === childId);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');

  useEffect(() => {
    if (child) {
      setName(child.displayName);
      setBirthDate(child.birthDate);
    }
  }, [child]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!childId || !name.trim() || !birthDate) return;
    await update(childId, { displayName: name, birthDate });
    navigate('/children');
  }

  async function onDelete() {
    if (!childId) return;
    await remove(childId);
    navigate('/children');
  }

  if (!loading && !child) {
    return <p className="text-sm text-gray-500">Not found</p>;
  }

  return (
    <div>
      <PageHeader title={t('children.editTitle')} />
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
        <Button type="submit">{t('save')}</Button>
        <Button type="button" variant="danger" onClick={onDelete}>
          {t('delete')}
        </Button>
      </form>
    </div>
  );
}