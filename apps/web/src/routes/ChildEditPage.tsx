import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isValidBirthDate } from '@kodoko/domain';
import { Button } from '@kodoko/ui';
import { useChildren } from '../hooks/useChildren';
import { AgeLabel } from '../components/AgeLabel';
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

  const birthDateValid = birthDate !== '' && isValidBirthDate(birthDate);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!childId || !name.trim() || !birthDateValid) return;
    await update(childId, { displayName: name, birthDate });
    navigate('/children');
  }

  async function onDelete() {
    if (!childId) return;
    await remove(childId);
    navigate('/children');
  }

  if (!loading && !child) {
    return <p className="text-sm text-gray-500">{t('children.notFound')}</p>;
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
          {birthDate !== '' && !birthDateValid && (
            <span className="text-xs text-red-600">{t('children.invalidBirthDate')}</span>
          )}
          {birthDateValid && (
            <span className="text-xs text-gray-500">
              <AgeLabel birthDate={birthDate} />
            </span>
          )}
        </label>
        <Button type="submit" disabled={!name.trim() || !birthDateValid}>
          {t('save')}
        </Button>
        <Button type="button" variant="danger" onClick={onDelete}>
          {t('delete')}
        </Button>
      </form>
    </div>
  );
}
