import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppTranslation } from '../hooks/useAppTranslation';
import { isValidBirthDate, type ChildGender } from '@kodoko/domain';
import { Button } from '@kodoko/ui';
import { useChildren } from '../hooks/useChildren';
import { AgeLabel } from '../components/AgeLabel';
import { PageHeader } from '../components/PageHeader';

const GENDER_OPTIONS: { value: ChildGender; key: string }[] = [
  { value: 'boy', key: 'children.genderBoy' },
  { value: 'girl', key: 'children.genderGirl' },
  { value: 'other', key: 'children.genderOther' },
];

export function ChildEditPage() {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const { childId } = useParams();
  const { children, update, remove, loading } = useChildren();

  const child = children.find((c) => c.id === childId);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<ChildGender | undefined>(undefined);

  useEffect(() => {
    if (child) {
      setName(child.displayName);
      setBirthDate(child.birthDate);
      setGender(child.gender);
    }
  }, [child]);

  const birthDateValid = birthDate !== '' && isValidBirthDate(birthDate);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!childId || !name.trim() || !birthDateValid) return;
    await update(childId, { displayName: name, birthDate, gender });
    navigate('/home');
  }

  async function onDelete() {
    if (!childId) return;
    await remove(childId);
    navigate('/home');
  }

  if (!loading && !child) {
    return <p className="text-sm text-gray-500">{t('children.notFound')}</p>;
  }

  return (
    <div>
      <PageHeader title={t('children.editTitle')} backTo="/home" />
      <form
        onSubmit={onSubmit}
        className="kodoko-panel flex flex-col gap-4 p-4"
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">
            {t('children.name')}
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-full border border-brand-100 px-3 py-2 text-sm shadow-sm focus:border-brand-600 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">
            {t('children.birthDate')}
          </span>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="rounded-full border border-brand-100 px-3 py-2 text-sm shadow-sm focus:border-brand-600 focus:outline-none"
          />
          {birthDate !== '' && !birthDateValid && (
            <span className="text-xs text-red-600">
              {t('children.invalidBirthDate')}
            </span>
          )}
          {birthDateValid && (
            <span className="text-xs text-gray-500">
              <AgeLabel birthDate={birthDate} />
            </span>
          )}
        </label>
        <fieldset>
          <legend className="text-sm font-medium text-gray-700">
            {t('children.gender')}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setGender(undefined)}
              className={`min-h-10 rounded-full border px-3 py-1.5 text-sm font-semibold shadow-sm ${
                gender === undefined
                  ? 'border-brand-700 bg-brand-600 text-white'
                  : 'border-brand-100 bg-white text-gray-600'
              }`}
            >
              {t('children.genderNone')}
            </button>
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setGender(gender === opt.value ? undefined : opt.value)
                }
                className={`min-h-10 rounded-full border px-3 py-1.5 text-sm font-semibold shadow-sm ${
                  gender === opt.value
                    ? 'border-brand-700 bg-brand-600 text-white'
                    : 'border-brand-100 bg-white text-gray-600'
                }`}
              >
                {t(opt.key)}
              </button>
            ))}
          </div>
        </fieldset>
        <Button type="submit" disabled={!name.trim() || !birthDateValid}>
          {t('common.save')}
        </Button>
        <Button type="button" variant="danger" onClick={onDelete}>
          {t('common.delete')}
        </Button>
      </form>
    </div>
  );
}
