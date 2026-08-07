import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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

export function ChildNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { create, creating } = useChildren();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<ChildGender | undefined>(undefined);

  const birthDateValid = birthDate !== '' && isValidBirthDate(birthDate);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !birthDateValid || creating) return;
    const created = await create({ displayName: name, birthDate, gender });
    navigate(`/children/${created.id}/edit`);
  }

  return (
    <div>
      <PageHeader title={t('children.new')} backTo="/home" />
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
        <fieldset>
          <legend className="text-sm font-medium text-gray-700">{t('children.gender')}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setGender(undefined)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                gender === undefined ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 text-gray-600'
              }`}
            >
              {t('children.genderNone')}
            </button>
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGender(gender === opt.value ? undefined : opt.value)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  gender === opt.value ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 text-gray-600'
                }`}
              >
                {t(opt.key)}
              </button>
            ))}
          </div>
        </fieldset>
        <Button type="submit" disabled={creating || !name.trim() || !birthDateValid}>
          {t('save')}
        </Button>
      </form>
    </div>
  );
}
